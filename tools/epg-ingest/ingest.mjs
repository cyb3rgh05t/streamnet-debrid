#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const refreshLimit = Number(process.env.EPG_REFRESH_LIMIT || "20");
const batchSize = Number(process.env.EPG_UPSERT_BATCH_SIZE || "400");
const defaultTtlMinutes = Number(process.env.EPG_SOURCE_TTL_MINUTES || "30");
const enablePrune = String(process.env.EPG_ENABLE_PRUNE || "false") === "true";
const xtreamMaxChannels = Number(process.env.EPG_XTREAM_MAX_CHANNELS || "60");
const xtreamShortEpgLimit = Number(process.env.EPG_XTREAM_SHORT_LIMIT || "36");

const WINDOW_PAST_SECONDS = 48 * 60 * 60;
const WINDOW_FUTURE_SECONDS = 48 * 60 * 60;

let supabaseUrl = "";
let serviceRole = "";

function fail(message) {
  console.error(`[epg-ingest] ${message}`);
  process.exit(1);
}

function loadSecretsProperties() {
  const filePath = path.resolve("secrets.properties");
  if (!fs.existsSync(filePath)) return {};
  const out = {};
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const lineRaw of lines) {
    const line = lineRaw.trim();
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const idx = line.indexOf("=");
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    if (!key) continue;
    out[key] = value;
  }
  return out;
}

function projectRefFromUrl(url) {
  const m = String(url || "").match(/^https:\/\/([a-z0-9]+)\.supabase\.co/i);
  return m ? m[1] : "";
}

function resolveServiceRoleFromCli(url) {
  const ref = projectRefFromUrl(url);
  if (!ref) return "";
  try {
    const raw = execSync(
      `supabase projects api-keys --project-ref ${ref} -o json`,
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    );
    const keys = JSON.parse(raw);
    if (!Array.isArray(keys)) return "";
    const match = keys.find((item) => item && item.name === "service_role");
    return String(match?.api_key || "").trim();
  } catch {
    return "";
  }
}

function resolveRuntimeConfig() {
  const secrets = loadSecretsProperties();

  supabaseUrl =
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    secrets.SUPABASE_URL ||
    "";

  serviceRole =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SERVICE_ROLE_KEY ||
    secrets.SUPABASE_SERVICE_ROLE_KEY ||
    secrets.SUPABASE_SECRET_KEY ||
    "";

  if (!serviceRole && supabaseUrl) {
    const resolved = resolveServiceRoleFromCli(supabaseUrl);
    if (resolved) {
      serviceRole = resolved;
      console.log("[epg-ingest] resolved service role via supabase CLI");
    }
  }

  if (!supabaseUrl) fail("SUPABASE_URL is missing");
  if (!serviceRole) {
    fail(
      "SUPABASE_SERVICE_ROLE_KEY is missing (set it or run supabase login for CLI fallback)",
    );
  }
}

function nowSeconds() {
  return Math.floor(Date.now() / 1000);
}

function isoFromSeconds(seconds) {
  return new Date(seconds * 1000).toISOString();
}

function decodeXmlEntities(input) {
  if (!input) return "";
  return input
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&#10;/g, "\n")
    .replace(/&#13;/g, "\r")
    .replace(/&#9;/g, "\t");
}

function parseXmltvTime(value) {
  if (!value || typeof value !== "string") return null;
  const raw = value.trim();
  const m = raw.match(
    /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})?\s*([+-]\d{4}|Z)?/,
  );
  if (!m) return null;

  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  const hour = Number(m[4]);
  const minute = Number(m[5]);
  const second = Number(m[6] || "0");
  const tz = m[7] || "+0000";

  const utcMs = Date.UTC(year, month - 1, day, hour, minute, second);
  if (!Number.isFinite(utcMs)) return null;

  if (tz === "Z") return Math.floor(utcMs / 1000);
  const tzMatch = tz.match(/^([+-])(\d{2})(\d{2})$/);
  if (!tzMatch) return Math.floor(utcMs / 1000);

  const sign = tzMatch[1] === "+" ? 1 : -1;
  const tzHours = Number(tzMatch[2]);
  const tzMinutes = Number(tzMatch[3]);
  const offsetSeconds = sign * (tzHours * 3600 + tzMinutes * 60);
  return Math.floor(utcMs / 1000) - offsetSeconds;
}

function extractFirstTag(block, tagName) {
  const re = new RegExp(
    `<${tagName}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tagName}>`,
    "i",
  );
  const match = block.match(re);
  if (!match) return "";
  return decodeXmlEntities(match[1]).replace(/\s+/g, " ").trim();
}

function parseProgrammeBlock(block) {
  const open = block.match(/^<programme\s+([^>]+)>/i);
  if (!open) return null;
  const attrs = open[1];
  const channelMatch = attrs.match(/\bchannel\s*=\s*"([^"]+)"/i);
  const startMatch = attrs.match(/\bstart\s*=\s*"([^"]+)"/i);
  const stopMatch = attrs.match(/\bstop\s*=\s*"([^"]+)"/i);
  if (!channelMatch || !startMatch || !stopMatch) return null;

  const channelId = decodeXmlEntities(channelMatch[1]).trim();
  const startSeconds = parseXmltvTime(startMatch[1]);
  const endSeconds = parseXmltvTime(stopMatch[1]);
  if (
    !channelId ||
    !startSeconds ||
    !endSeconds ||
    endSeconds <= startSeconds
  ) {
    return null;
  }

  const title = extractFirstTag(block, "title").slice(0, 300);
  if (!title) return null;
  const descr = extractFirstTag(block, "desc").slice(0, 1500);

  return {
    channelId,
    startSeconds,
    endSeconds,
    title,
    descr: descr || null,
  };
}

function toWantedChannelSet(raw) {
  if (!Array.isArray(raw)) return null;
  const set = new Set();
  for (const item of raw) {
    if (typeof item !== "string") continue;
    const trimmed = item.trim();
    if (!trimmed) continue;
    set.add(trimmed);
  }
  return set.size > 0 ? set : null;
}

function normalizeXtreamHost(raw) {
  let host = String(raw || "").trim();
  if (!host) return "";
  if (!/^https?:\/\//i.test(host)) host = `http://${host}`;
  host = host.replace(/\/+$/, "");
  return host;
}

function decodeMaybeBase64(value) {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (
    !/^[A-Za-z0-9+/=\s]+$/.test(trimmed) ||
    trimmed.length < 8 ||
    trimmed.length % 4 !== 0
  ) {
    return decodeXmlEntities(trimmed);
  }
  try {
    const decoded = Buffer.from(trimmed, "base64").toString("utf8");
    const printable = decoded.replace(/[\x20-\x7E\u00A0-\u024F]/g, "").length;
    if (decoded && printable <= Math.floor(decoded.length * 0.2)) {
      return decodeXmlEntities(decoded).replace(/\s+/g, " ").trim();
    }
  } catch {
    // Ignore and fall back to raw.
  }
  return decodeXmlEntities(trimmed).replace(/\s+/g, " ").trim();
}

function parseXtreamSeconds(value) {
  if (value == null) return null;
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }
  const text = String(value).trim();
  if (!text) return null;
  if (/^\d{9,12}$/.test(text)) return Math.trunc(Number(text));
  return parseXmltvTime(text);
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      apikey: serviceRole,
      Authorization: `Bearer ${serviceRole}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`HTTP ${response.status}: ${text}`);
  }

  return response.json();
}

async function patchSource(sourceKey, patch) {
  const response = await fetch(
    `${supabaseUrl}/rest/v1/epg_source?source_key=eq.${encodeURIComponent(sourceKey)}`,
    {
      method: "PATCH",
      headers: {
        apikey: serviceRole,
        Authorization: `Bearer ${serviceRole}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        ...patch,
        updated_at: new Date().toISOString(),
      }),
    },
  );

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(
      `source patch failed (${sourceKey}): ${response.status} ${text}`,
    );
  }
}

async function upsertPrograms(rows) {
  if (!rows.length) return;
  const response = await fetch(
    `${supabaseUrl}/rest/v1/epg_program?on_conflict=source_key,epg_channel_id,start_s,end_s,title`,
    {
      method: "POST",
      headers: {
        apikey: serviceRole,
        Authorization: `Bearer ${serviceRole}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify(rows),
    },
  );

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`program upsert failed: ${response.status} ${text}`);
  }
}

async function pruneSourceRows(sourceKey, windowStart, windowEnd) {
  if (!enablePrune) return;
  const params = new URLSearchParams();
  params.set("source_key", `eq.${sourceKey}`);
  params.set("or", `(end_s.lte.${windowStart},start_s.gte.${windowEnd})`);

  const response = await fetch(
    `${supabaseUrl}/rest/v1/epg_program?${params.toString()}`,
    {
      method: "DELETE",
      headers: {
        apikey: serviceRole,
        Authorization: `Bearer ${serviceRole}`,
        Prefer: "return=minimal",
      },
    },
  );

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(
      `program prune failed (${sourceKey}): ${response.status} ${text}`,
    );
  }
}

async function loadRefreshCandidates() {
  const nowIso = new Date().toISOString();
  const params = new URLSearchParams();
  params.set(
    "select",
    "source_key,kind,owner_user,url,xtream_ref,wanted_channels,expires_at,status,etag,last_modified",
  );
  params.set(
    "or",
    `(expires_at.is.null,expires_at.lt.${nowIso},status.eq.pending,status.eq.error)`,
  );
  params.set("order", "last_requested_at.desc");
  params.set("limit", String(refreshLimit));

  const url = `${supabaseUrl}/rest/v1/epg_source?${params.toString()}`;
  return fetchJson(url);
}

async function fetchXtreamShortEpg({ host, username, password, channelId }) {
  const params = new URLSearchParams();
  params.set("username", username);
  params.set("password", password);
  params.set("action", "get_short_epg");
  params.set("stream_id", channelId);
  params.set("limit", String(xtreamShortEpgLimit));

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetch(
      `${host}/player_api.php?${params.toString()}`,
      {
        signal: controller.signal,
        headers: {
          "User-Agent": "streamnet-epg-ingest/1.0",
          Accept: "application/json,*/*",
        },
      },
    );
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(
        `xtream short epg failed (${response.status}): ${text.slice(0, 240)}`,
      );
    }
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

async function processXmltvSource(row) {
  const sourceKey = row.source_key;
  const sourceUrl = String(row.url || "").trim();
  if (!sourceUrl) {
    throw new Error("xmltv source has empty url");
  }

  const now = nowSeconds();
  const windowStart = now - WINDOW_PAST_SECONDS;
  const windowEnd = now + WINDOW_FUTURE_SECONDS;
  const wanted = toWantedChannelSet(row.wanted_channels);

  const headers = {
    "User-Agent": "streamnet-epg-ingest/1.0",
    Accept: "application/xml,text/xml,*/*",
  };
  if (row.etag) headers["If-None-Match"] = row.etag;
  if (row.last_modified) headers["If-Modified-Since"] = row.last_modified;

  const response = await fetch(sourceUrl, { headers });
  if (response.status === 304) {
    await patchSource(sourceKey, {
      fetched_at: isoFromSeconds(now),
      expires_at: isoFromSeconds(now + defaultTtlMinutes * 60),
      status: "ok",
    });
    return { programs: 0, refreshed: false, notModified: true };
  }
  if (!response.ok || !response.body) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `xmltv fetch failed (${response.status}): ${body.slice(0, 300)}`,
    );
  }

  const etag = response.headers.get("etag");
  const lastModified = response.headers.get("last-modified");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let batch = [];
  let totalUpserted = 0;

  async function flushBatch() {
    if (!batch.length) return;
    await upsertPrograms(batch);
    totalUpserted += batch.length;
    batch = [];
  }

  while (true) {
    const { done, value } = await reader.read();
    if (value) {
      buffer += decoder.decode(value, { stream: true });
    }

    while (true) {
      const start = buffer.indexOf("<programme ");
      const end = buffer.indexOf("</programme>");
      if (start === -1 || end === -1 || end < start) break;

      const blockEnd = end + "</programme>".length;
      const block = buffer.slice(start, blockEnd);
      buffer = buffer.slice(blockEnd);

      const program = parseProgrammeBlock(block);
      if (!program) continue;
      if (wanted && !wanted.has(program.channelId)) continue;
      if (
        program.endSeconds <= windowStart ||
        program.startSeconds >= windowEnd
      )
        continue;

      batch.push({
        source_key: sourceKey,
        epg_channel_id: program.channelId,
        start_s: program.startSeconds,
        end_s: program.endSeconds,
        title: program.title,
        descr: program.descr,
      });

      if (batch.length >= batchSize) {
        await flushBatch();
      }
    }

    if (buffer.length > 2_000_000) {
      // Guard: keep tail in memory if XML has long spans without a close tag.
      buffer = buffer.slice(-200_000);
    }

    if (done) break;
  }

  buffer += decoder.decode();
  await flushBatch();
  await pruneSourceRows(sourceKey, windowStart, windowEnd);

  const fetchedAt = isoFromSeconds(nowSeconds());
  await patchSource(sourceKey, {
    fetched_at: fetchedAt,
    expires_at: isoFromSeconds(nowSeconds() + defaultTtlMinutes * 60),
    etag: etag || null,
    last_modified: lastModified || null,
    status: "ok",
  });

  return { programs: totalUpserted, refreshed: true, notModified: false };
}

async function processXtreamSource(row) {
  const sourceKey = row.source_key;
  const rawRef = row.xtream_ref;
  let ref;
  if (rawRef && typeof rawRef === "object") {
    ref = rawRef;
  } else {
    const rawText = String(rawRef || "").trim();
    if (!rawText) {
      throw new Error("xtream source has empty xtream_ref");
    }
    try {
      ref = JSON.parse(rawText);
    } catch {
      throw new Error("xtream_ref is not valid JSON");
    }
  }

  const host = normalizeXtreamHost(ref.host);
  const username = String(ref.username || "").trim();
  const password = String(ref.password || "").trim();
  if (!host || !username || !password) {
    throw new Error("xtream_ref is missing host/username/password");
  }

  const wanted = Array.from(toWantedChannelSet(row.wanted_channels) || []);
  if (wanted.length === 0) {
    throw new Error("xtream source has no wanted_channels");
  }

  const now = nowSeconds();
  const windowStart = now - WINDOW_PAST_SECONDS;
  const windowEnd = now + WINDOW_FUTURE_SECONDS;
  let batch = [];
  let totalUpserted = 0;

  async function flushBatch() {
    if (!batch.length) return;
    await upsertPrograms(batch);
    totalUpserted += batch.length;
    batch = [];
  }

  const channelIds = wanted.slice(0, xtreamMaxChannels);
  for (const channelId of channelIds) {
    let payload;
    try {
      payload = await fetchXtreamShortEpg({
        host,
        username,
        password,
        channelId,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(
        `[epg-ingest] xtream channel skip id=${channelId} error=${message}`,
      );
      continue;
    }

    const listings = Array.isArray(payload?.epg_listings)
      ? payload.epg_listings
      : Array.isArray(payload?.listings)
        ? payload.listings
        : [];

    for (const item of listings) {
      const startSeconds =
        parseXtreamSeconds(item?.start_timestamp) ??
        parseXtreamSeconds(item?.start);
      const endSeconds =
        parseXtreamSeconds(item?.stop_timestamp) ??
        parseXtreamSeconds(item?.end);
      if (!startSeconds || !endSeconds || endSeconds <= startSeconds) continue;
      if (endSeconds <= windowStart || startSeconds >= windowEnd) continue;

      const title = decodeMaybeBase64(String(item?.title || "")).slice(0, 300);
      if (!title) continue;
      const descr =
        decodeMaybeBase64(String(item?.description || "")).slice(0, 1500) ||
        null;

      batch.push({
        source_key: sourceKey,
        epg_channel_id: String(channelId),
        start_s: startSeconds,
        end_s: endSeconds,
        title,
        descr,
      });

      if (batch.length >= batchSize) {
        await flushBatch();
      }
    }
  }

  await flushBatch();
  await pruneSourceRows(sourceKey, windowStart, windowEnd);

  await patchSource(sourceKey, {
    fetched_at: isoFromSeconds(nowSeconds()),
    expires_at: isoFromSeconds(nowSeconds() + defaultTtlMinutes * 60),
    etag: null,
    last_modified: null,
    status: "ok",
  });

  return { programs: totalUpserted, refreshed: true, notModified: false };
}

async function processCandidate(row) {
  const sourceKey = row.source_key;
  const kind = row.kind;
  if (kind !== "xmltv" && kind !== "xtream") {
    console.log(`[epg-ingest] skip source=${sourceKey} kind=${kind}`);
    return;
  }

  try {
    const result =
      kind === "xmltv"
        ? await processXmltvSource(row)
        : await processXtreamSource(row);
    const suffix = result.notModified
      ? "not-modified"
      : `upserted=${result.programs}`;
    console.log(`[epg-ingest] ok source=${sourceKey} kind=${kind} ${suffix}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[epg-ingest] error source=${sourceKey} ${message}`);
    await patchSource(sourceKey, {
      status: "error",
      expires_at: isoFromSeconds(nowSeconds() + 10 * 60),
    }).catch((patchError) => {
      console.error("[epg-ingest] patch source error failed", patchError);
    });
  }
}

async function main() {
  resolveRuntimeConfig();
  console.log("[epg-ingest] worker phase2 starting");
  const rows = await loadRefreshCandidates();

  console.log(`[epg-ingest] candidates=${rows.length}`);
  for (const row of rows) {
    await processCandidate(row);
  }

  console.log("[epg-ingest] phase2 completed");
}

main().catch((error) => {
  console.error("[epg-ingest] failed", error);
  process.exit(1);
});
