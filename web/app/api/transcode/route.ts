import { NextRequest } from "next/server";
import { spawn } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { mkdir, readFile, rm, stat } from "node:fs/promises";
import path from "node:path";
import { createInternalMediaToken } from "@/lib/server/internalMedia";

// Last-resort server-side fallback: when a source's audio codec can be
// played by neither the browser directly nor the in-browser WebCodecs remux
// (playerRecovery.ts / lib/remux.ts), re-encode just the audio to AAC on our
// own server and stream the result back as a progressive MP4. Video is
// always stream-copied (cheap); only audio is actually transcoded.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// ffmpeg/ffprobe read from our own already-validated /api/proxy response,
// never straight from a user-supplied URL — their HTTP clients have none of
// safeProxy.ts's SSRF protections (private-IP blocking, DNS-rebind pinning).
const INTERNAL_ORIGIN = "http://127.0.0.1:3000";
const MAX_CONCURRENT = 4;
let active = 0;
const sessionRoot = path.join("/tmp", "streamnet-transcode");
const sessions = new Map<
  string,
  {
    directory: string;
    process: ReturnType<typeof spawn>;
    created: number;
    lastAccess: number;
    key: string;
    running: boolean;
  }
>();
const SESSION_TTL_MS = 30 * 60 * 1000;
const MAX_RUNNING_SESSION_MS = 3 * 60 * 60 * 1000;

function sessionKey(
  url: string,
  headers: Record<string, string>,
  start: number,
) {
  return createHash("sha256")
    .update(url)
    .update(JSON.stringify(headers))
    .update(String(start))
    .digest("hex");
}

function removeSession(id: string, kill: boolean) {
  const session = sessions.get(id);
  if (!session) return;
  sessions.delete(id);
  if (kill && session.running) session.process.kill("SIGKILL");
  if (session.running) {
    session.running = false;
    active--;
  }
  void rm(session.directory, { recursive: true, force: true });
}

const sessionJanitor = setInterval(
  () => {
    const now = Date.now();
    for (const [id, session] of sessions) {
      const age = now - session.created;
      const idle = now - session.lastAccess;
      if (
        (session.running && age > MAX_RUNNING_SESSION_MS) ||
        (!session.running && idle > SESSION_TTL_MS)
      )
        removeSession(id, true);
    }
  },
  5 * 60 * 1000,
);
sessionJanitor.unref?.();

function json(value: unknown, status: number) {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
    },
  });
}

function resolveInternalUrl(
  rawUrl: string,
  headers: Record<string, string>,
): URL | null {
  try {
    const parsed = new URL(rawUrl);
    if (!["http:", "https:"].includes(parsed.protocol)) return null;
    const token = createInternalMediaToken(parsed.toString(), headers);
    return new URL(
      `/api/proxy?internal=${encodeURIComponent(token)}`,
      INTERNAL_ORIGIN,
    );
  } catch {
    return null;
  }
}

/**
 * `<video>` never learns a real duration for the streamed-transcode output
 * (no Content-Length, no moov duration while ffmpeg is still writing it), so
 * Continue Watching progress has nothing to divide by. The player probes
 * this once up front and carries the real length as `knownDurationSeconds`.
 */
async function probeDuration(internalUrl: URL): Promise<Response> {
  const args = [
    "-v",
    "error",
    "-show_entries",
    "format=duration",
    "-of",
    "json",
    internalUrl.toString(),
  ];
  const durationSeconds = await new Promise<number | null>((resolve) => {
    let out = "";
    let proc;
    try {
      proc = spawn("ffprobe", args, { stdio: ["ignore", "pipe", "ignore"] });
    } catch {
      resolve(null);
      return;
    }
    proc.stdout.on("data", (chunk: Buffer) => {
      out += chunk.toString("utf8");
    });
    proc.on("error", () => resolve(null));
    proc.on("close", () => {
      try {
        const parsed = JSON.parse(out) as { format?: { duration?: string } };
        const value = Number(parsed.format?.duration);
        resolve(Number.isFinite(value) && value > 0 ? value : null);
      } catch {
        resolve(null);
      }
    });
    const timer = setTimeout(() => proc.kill("SIGKILL"), 15_000);
    proc.on("close", () => clearTimeout(timer));
  });
  return json({ durationSeconds }, 200);
}

export async function GET(request: NextRequest) {
  const input = new URL(request.url);
  const sessionId = input.searchParams.get("session");
  if (sessionId)
    return serveSessionFile(sessionId, input.searchParams.get("file"));
  const raw = input.searchParams.get("url");
  if (!raw) return json({ error: "Missing url" }, 400);

  const headers = decodeHeaders(input.searchParams.get("headers"));
  const internalUrl = resolveInternalUrl(raw, headers);
  if (!internalUrl) {
    return json(
      { error: "Only public HTTP media URLs may be transcoded" },
      400,
    );
  }

  if (input.searchParams.get("probe") === "1")
    return probeDuration(internalUrl);

  if (active >= MAX_CONCURRENT) {
    return json(
      { error: "Too many active transcodes. Try again shortly." },
      429,
    );
  }

  const startSeconds = Math.max(
    0,
    Math.floor(Number(input.searchParams.get("t") ?? "0") || 0),
  );

  const args = [
    "-nostdin",
    "-hide_banner",
    "-loglevel",
    "error",
    "-probesize",
    "5000000",
    "-analyzeduration",
    "5000000",
    "-fflags",
    "+genpts+discardcorrupt",
    "-err_detect",
    "ignore_err",
    ...(startSeconds > 0 ? ["-ss", String(startSeconds)] : []),
    "-i",
    internalUrl.toString(),
    "-map",
    "0:v:0",
    "-map",
    "0:a:0?",
    "-c:v",
    "copy",
    "-c:a",
    "aac",
    "-ar",
    "48000",
    "-ac",
    "2",
    "-b:a",
    "192k",
    "-af",
    "aresample=async=1:first_pts=0:min_hard_comp=0.100000",
    "-movflags",
    "frag_keyframe+empty_moov+default_base_moof",
    "-f",
    "mp4",
    "pipe:1",
  ];

  let ff;
  try {
    ff = spawn("ffmpeg", args, { stdio: ["ignore", "pipe", "pipe"] });
  } catch {
    return json({ error: "Server transcoder is unavailable" }, 502);
  }

  active++;
  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    active--;
  };

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      ff.stdout.on("data", (chunk: Buffer) => {
        try {
          controller.enqueue(new Uint8Array(chunk));
        } catch {
          // Controller already closed (client disconnected mid-stream).
        }
      });
      ff.on("close", (code) => {
        release();
        try {
          if (code && code !== 0)
            controller.error(new Error(`ffmpeg exited with code ${code}`));
          else controller.close();
        } catch {
          // Already closed/errored.
        }
      });
      ff.on("error", () => {
        release();
        try {
          controller.error(new Error("ffmpeg failed to start"));
        } catch {
          // Already closed/errored.
        }
      });
    },
    cancel() {
      ff.kill("SIGKILL");
      release();
    },
  });

  request.signal.addEventListener("abort", () => {
    ff.kill("SIGKILL");
    release();
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "content-type": "video/mp4",
      "cache-control": "no-store",
      "access-control-allow-origin": "*",
    },
  });
}

export async function POST(request: NextRequest) {
  let body: {
    url?: string;
    headers?: Record<string, string>;
    startSeconds?: number;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return json({ error: "Invalid request" }, 400);
  }
  if (!body.url || !/^https?:/i.test(body.url))
    return json({ error: "A public HTTP media URL is required" }, 400);
  const id = randomBytes(16).toString("hex");
  const directory = path.join(sessionRoot, id);
  const startSeconds = Math.max(0, Math.floor(Number(body.startSeconds) || 0));
  const key = sessionKey(body.url, body.headers ?? {}, startSeconds);
  const existing = [...sessions.entries()].find(
    ([, session]) => session.key === key,
  );
  if (existing) {
    existing[1].lastAccess = Date.now();
    return json(
      {
        sessionId: existing[0],
        url: `/api/transcode?session=${existing[0]}&file=index.m3u8`,
        startSeconds,
      },
      200,
    );
  }
  if (active >= MAX_CONCURRENT)
    return new Response(
      JSON.stringify({ error: "Too many active transcodes" }),
      {
        status: 429,
        headers: {
          "content-type": "application/json",
          "retry-after": "5",
          "cache-control": "no-store",
        },
      },
    );
  await mkdir(directory, { recursive: true });
  const internalUrl = resolveInternalUrl(body.url, body.headers ?? {});
  if (!internalUrl) {
    await rm(directory, { recursive: true, force: true });
    return json({ error: "Invalid media URL" }, 400);
  }
  const args = [
    "-nostdin",
    "-hide_banner",
    "-loglevel",
    "error",
    "-probesize",
    "5000000",
    "-analyzeduration",
    "5000000",
    "-fflags",
    "+genpts+discardcorrupt",
    "-err_detect",
    "ignore_err",
    ...(startSeconds > 0 ? ["-ss", String(startSeconds)] : []),
    "-i",
    internalUrl.toString(),
    "-map",
    "0:v:0",
    "-map",
    "0:a:0?",
    "-c:v",
    "copy",
    "-c:a",
    "aac",
    "-ar",
    "48000",
    "-ac",
    "2",
    "-b:a",
    "192k",
    "-af",
    "aresample=async=1:first_pts=0:min_hard_comp=0.100000",
    "-f",
    "hls",
    "-hls_time",
    "4",
    "-hls_list_size",
    "0",
    "-hls_flags",
    "independent_segments+append_list",
    "-hls_segment_filename",
    path.join(directory, "segment-%06d.ts"),
    path.join(directory, "index.m3u8"),
  ];
  let ff;
  try {
    ff = spawn("ffmpeg", args, { stdio: ["ignore", "ignore", "pipe"] });
  } catch {
    await rm(directory, { recursive: true, force: true });
    return json({ error: "Server transcoder is unavailable" }, 502);
  }
  active++;
  sessions.set(id, {
    directory,
    process: ff,
    created: Date.now(),
    lastAccess: Date.now(),
    key,
    running: true,
  });
  ff.on("close", () => {
    const session = sessions.get(id);
    if (!session) return;
    session.running = false;
    active--;
  });
  ff.on("error", () => {
    removeSession(id, false);
  });
  // The POST only creates the session. Its request signal ends when the short
  // JSON response is delivered, which must not terminate the FFmpeg process
  // before the browser requests the playlist and its segments.
  return json(
    {
      sessionId: id,
      url: `/api/transcode?session=${id}&file=index.m3u8`,
      startSeconds,
    },
    201,
  );
}

async function serveSessionFile(sessionId: string, requested: string | null) {
  const session = sessions.get(sessionId);
  if (!/^[a-f0-9]{32}$/i.test(sessionId))
    return json({ error: "Transcode session not found" }, 404);
  const directory = session?.directory ?? path.join(sessionRoot, sessionId);
  if (session) session.lastAccess = Date.now();
  const file = requested === "index.m3u8" ? requested : (requested ?? "");
  if (!/^(index\.m3u8|segment-\d{6}\.ts)$/.test(file))
    return json({ error: "Invalid transcode file" }, 400);
  try {
    const filePath = path.join(directory, file);
    const info = await stat(filePath);
    let data: Uint8Array = await readFile(filePath);
    if (file === "index.m3u8") {
      const playlist = Buffer.from(data)
        .toString("utf8")
        .replace(
          /(^|\r?\n)(segment-\d{6}\.ts)(?=\r?$)/gm,
          (_match, prefix: string, segment: string) =>
            `${prefix}/api/transcode?session=${encodeURIComponent(sessionId)}&file=${segment}`,
        );
      data = new Uint8Array(Buffer.from(playlist, "utf8"));
    }
    const body = file.endsWith(".m3u8")
      ? Buffer.from(data).toString("utf8")
      : new Blob([new Uint8Array(data).buffer as ArrayBuffer]);
    return new Response(body, {
      headers: {
        "content-type": file.endsWith(".m3u8")
          ? "application/vnd.apple.mpegurl"
          : "video/mp2t",
        "content-length": String(data.byteLength),
        "cache-control": file.endsWith(".m3u8")
          ? "no-store"
          : "private, max-age=31536000",
        "access-control-allow-origin": "*",
      },
    });
  } catch {
    return json({ error: "Transcode file is not ready" }, 404);
  }
}

function decodeHeaders(raw: string | null): Record<string, string> {
  if (!raw) return {};
  try {
    const value = JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
    if (!value || typeof value !== "object") return {};
    const headers: Record<string, string> = {};
    for (const [key, item] of Object.entries(value)) {
      if (typeof item === "string" && item.length <= 8192) headers[key] = item;
    }
    return headers;
  } catch {
    return {};
  }
}
