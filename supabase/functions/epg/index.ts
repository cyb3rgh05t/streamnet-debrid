import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

type EpgSourceKind = "xmltv" | "xtream";

type EpgRequestBody = {
  source?: {
    kind?: EpgSourceKind;
    url?: string;
    host?: string;
    username?: string;
    password?: string;
  };
  channels?: string[];
  cursor?: string;
  page?: number;
};

const WINDOW_PAST_SECONDS = 48 * 60 * 60;
const WINDOW_FUTURE_SECONDS = 48 * 60 * 60;
const MAX_CHANNELS_PER_REQUEST = 120;

const RATE_LIMIT = 90;
const RATE_WINDOW_MS = 60 * 1000;
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

const DEFAULT_ALLOWED_ORIGINS = (
  Deno.env.get("CORS_ALLOWED_ORIGINS") ||
  "https://auth.arvio.tv,https://arvio.tv"
)
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") || "";
  const allowOrigin = DEFAULT_ALLOWED_ORIGINS.includes(origin)
    ? origin
    : "null";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers":
      "authorization, apikey, x-client-info, content-type, x-user-token",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

function jsonResponse(
  req: Request,
  body: Record<string, unknown>,
  status = 200,
  extra: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(req),
      "Content-Type": "application/json",
      ...extra,
    },
  });
}

function clientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

function checkRateLimit(req: Request): boolean {
  const now = Date.now();
  const ip = clientIp(req);
  const bucket = rateLimitMap.get(ip);

  if (!bucket || bucket.resetAt <= now) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (bucket.count >= RATE_LIMIT) return false;
  bucket.count += 1;
  return true;
}

setInterval(() => {
  const now = Date.now();
  for (const [ip, bucket] of rateLimitMap.entries()) {
    if (bucket.resetAt <= now) rateLimitMap.delete(ip);
  }
}, RATE_WINDOW_MS);

function sanitizeChannelIds(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const out = new Array<string>();
  for (const raw of input) {
    if (typeof raw !== "string") continue;
    const id = raw.trim();
    if (!id) continue;
    out.push(id.slice(0, 128));
    if (out.length >= MAX_CHANNELS_PER_REQUEST) break;
  }
  return Array.from(new Set(out));
}

function normalizeXmltvUrl(raw: string): string {
  const parsed = new URL(raw.trim());
  parsed.hash = "";
  if (
    (parsed.protocol === "http:" && parsed.port === "80") ||
    (parsed.protocol === "https:" && parsed.port === "443")
  ) {
    parsed.port = "";
  }
  const host = parsed.hostname.toLowerCase();
  parsed.hostname = host;
  return parsed.toString();
}

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

async function resolveUserId(
  supabaseUrl: string,
  anonKey: string,
  token: string | null,
): Promise<string | null> {
  if (!token || token.length < 20 || /\s/.test(token)) return null;

  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) return null;

  const json = (await response.json().catch(() => null)) as {
    id?: string;
  } | null;
  const id = json?.id?.trim();
  return id && id.length <= 64 ? id : null;
}

async function buildSourceDescriptor(
  source: EpgRequestBody["source"],
  userId: string | null,
): Promise<{
  sourceKey: string;
  ownerUser: string | null;
  kind: EpgSourceKind;
  url: string | null;
  xtreamRef: string | null;
}> {
  const kind = source?.kind;
  if (kind === "xmltv") {
    const rawUrl = source.url?.trim() || "";
    if (!rawUrl) throw new Error("source.url is required for xmltv");
    const normalizedUrl = normalizeXmltvUrl(rawUrl);
    const sourceKey = `xmltv:${await sha256Hex(normalizedUrl)}`;
    return {
      sourceKey,
      ownerUser: null,
      kind,
      url: normalizedUrl,
      xtreamRef: null,
    };
  }

  if (kind === "xtream") {
    const host = source.host?.trim() || "";
    const username = source.username?.trim() || "";
    const password = source.password?.trim() || "";
    if (!host || !username || !password) {
      throw new Error(
        "source.host, source.username, and source.password are required for xtream",
      );
    }
    if (!userId) {
      throw new Error("x-user-token is required for private xtream sources");
    }
    const material = `${host}|${username}|${password}|${userId}`;
    const sourceKey = `xtream:${await sha256Hex(material)}`;
    const xtreamRef = JSON.stringify({ host, username, password });
    return {
      sourceKey,
      ownerUser: userId,
      kind,
      url: null,
      xtreamRef,
    };
  }

  throw new Error("source.kind must be xmltv or xtream");
}

async function upsertSourceRegistration(
  supabaseUrl: string,
  serviceRole: string,
  payload: {
    sourceKey: string;
    kind: EpgSourceKind;
    ownerUser: string | null;
    url: string | null;
    xtreamRef: string | null;
    channels: string[];
  },
): Promise<void> {
  const body = {
    source_key: payload.sourceKey,
    kind: payload.kind,
    owner_user: payload.ownerUser,
    url: payload.url,
    xtream_ref: payload.xtreamRef,
    wanted_channels: payload.channels,
    last_requested_at: new Date().toISOString(),
    status: "pending",
  };

  const response = await fetch(
    `${supabaseUrl}/rest/v1/epg_source?on_conflict=source_key`,
    {
      method: "POST",
      headers: {
        apikey: serviceRole,
        Authorization: `Bearer ${serviceRole}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify(body),
    },
  );

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`epg_source upsert failed: ${response.status} ${text}`);
  }
}

function postgrestInList(values: string[]): string {
  return `(${values.map((value) => `"${value.replace(/"/g, '\\"')}"`).join(",")})`;
}

async function loadWindowRows(
  supabaseUrl: string,
  serviceRole: string,
  sourceKey: string,
  channelIds: string[],
  windowStart: number,
  windowEnd: number,
): Promise<
  Array<{
    epg_channel_id: string;
    start_s: number;
    end_s: number;
    title: string;
    descr: string | null;
  }>
> {
  const params = new URLSearchParams();
  params.set("select", "epg_channel_id,start_s,end_s,title,descr");
  params.set("source_key", `eq.${sourceKey}`);
  params.set("epg_channel_id", `in.${postgrestInList(channelIds)}`);
  params.set("start_s", `lt.${windowEnd}`);
  params.set("end_s", `gt.${windowStart}`);
  params.set("order", "epg_channel_id.asc,start_s.asc");

  const response = await fetch(
    `${supabaseUrl}/rest/v1/epg_program?${params.toString()}`,
    {
      method: "GET",
      headers: {
        apikey: serviceRole,
        Authorization: `Bearer ${serviceRole}`,
      },
    },
  );

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`epg_program read failed: ${response.status} ${text}`);
  }

  return await response.json();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(req) });
  }
  if (req.method !== "POST") {
    return jsonResponse(req, { error: "Method not allowed" }, 405);
  }

  try {
    const anonHeader = req.headers.get("apikey");
    const authHeader = req.headers.get("authorization");
    const expectedAnon =
      Deno.env.get("APP_ANON_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY");

    const hasValidApiKey =
      !!anonHeader && !!expectedAnon && anonHeader === expectedAnon;
    const hasValidBearer =
      !!authHeader &&
      authHeader.startsWith("Bearer ") &&
      !!expectedAnon &&
      authHeader.replace("Bearer ", "") === expectedAnon;

    if (!hasValidApiKey && !hasValidBearer) {
      return jsonResponse(req, { error: "Unauthorized" }, 401);
    }
    if (!checkRateLimit(req)) {
      return jsonResponse(req, { error: "Rate limit exceeded" }, 429);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRole || !expectedAnon) {
      throw new Error("Missing Supabase credentials");
    }

    const body = (await req.json().catch(() => ({}))) as EpgRequestBody;
    const channelIds = sanitizeChannelIds(body.channels);
    if (channelIds.length === 0) {
      return jsonResponse(
        req,
        { error: "channels must contain at least one id" },
        400,
      );
    }

    const userToken = req.headers.get("x-user-token");
    const userId = await resolveUserId(supabaseUrl, expectedAnon, userToken);
    const source = await buildSourceDescriptor(body.source, userId);

    await upsertSourceRegistration(supabaseUrl, serviceRole, {
      sourceKey: source.sourceKey,
      kind: source.kind,
      ownerUser: source.ownerUser,
      url: source.url,
      xtreamRef: source.xtreamRef,
      channels: channelIds,
    });

    const nowSeconds = Math.floor(Date.now() / 1000);
    const windowStart = nowSeconds - WINDOW_PAST_SECONDS;
    const windowEnd = nowSeconds + WINDOW_FUTURE_SECONDS;

    const rows = await loadWindowRows(
      supabaseUrl,
      serviceRole,
      source.sourceKey,
      channelIds,
      windowStart,
      windowEnd,
    );

    if (rows.length === 0) {
      const cacheControl =
        source.ownerUser == null
          ? "public, max-age=20, s-maxage=60"
          : "private, no-store";
      return jsonResponse(
        req,
        {
          status: "warming",
          source: source.sourceKey,
          generatedAt: nowSeconds,
          windowStart,
          windowEnd,
          channels: {},
        },
        202,
        { "Cache-Control": cacheControl },
      );
    }

    const grouped: Record<
      string,
      Array<{ s: number; e: number; t: string; d?: string }>
    > = {};
    for (const row of rows) {
      if (!grouped[row.epg_channel_id]) grouped[row.epg_channel_id] = [];
      grouped[row.epg_channel_id].push({
        s: row.start_s - windowStart,
        e: row.end_s - windowStart,
        t: row.title,
        ...(row.descr ? { d: row.descr } : {}),
      });
    }

    const cacheControl =
      source.ownerUser == null
        ? "public, max-age=30, s-maxage=120, stale-while-revalidate=300"
        : "private, no-store";

    return jsonResponse(
      req,
      {
        status: "ok",
        source: source.sourceKey,
        generatedAt: nowSeconds,
        windowStart,
        windowEnd,
        channels: grouped,
      },
      200,
      { "Cache-Control": cacheControl },
    );
  } catch (error) {
    console.error(error);
    return jsonResponse(
      req,
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      500,
    );
  }
});
