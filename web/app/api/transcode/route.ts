import { NextRequest } from "next/server";
import { spawn } from "node:child_process";

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

function json(value: unknown, status: number) {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
    },
  });
}

function resolveInternalUrl(rawUrl: string, requestOrigin: string): URL | null {
  try {
    const parsed = new URL(rawUrl, requestOrigin);
    if (parsed.origin !== requestOrigin || parsed.pathname !== "/api/proxy")
      return null;
    return new URL(`${parsed.pathname}${parsed.search}`, INTERNAL_ORIGIN);
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
  const raw = input.searchParams.get("url");
  if (!raw) return json({ error: "Missing url" }, 400);

  const internalUrl = resolveInternalUrl(raw, input.origin);
  if (!internalUrl) {
    return json(
      { error: "Only an already-proxied /api/proxy URL may be transcoded" },
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
