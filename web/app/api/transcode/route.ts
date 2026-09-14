import { NextRequest } from "next/server";
import { spawn } from "node:child_process";

// Last-resort server-side fallback: when a source's audio codec can be
// played by neither the browser directly nor the in-browser WebCodecs remux
// (playerRecovery.ts / lib/remux.ts), re-encode just the audio to AAC on our
// own server and stream the result back as a progressive MP4. Video is
// always stream-copied (cheap); only audio is actually transcoded.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// ffmpeg reads from our own already-validated /api/proxy response, never
// straight from a user-supplied URL — ffmpeg's HTTP client has none of
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

export async function GET(request: NextRequest) {
  const input = new URL(request.url);
  const raw = input.searchParams.get("url");
  if (!raw) return json({ error: "Missing url" }, 400);
  if (active >= MAX_CONCURRENT) {
    return json(
      { error: "Too many active transcodes. Try again shortly." },
      429,
    );
  }

  let internalUrl: URL;
  try {
    const parsed = new URL(raw, input.origin);
    if (parsed.origin !== input.origin || parsed.pathname !== "/api/proxy") {
      return json(
        { error: "Only an already-proxied /api/proxy URL may be transcoded" },
        400,
      );
    }
    internalUrl = new URL(
      `${parsed.pathname}${parsed.search}`,
      INTERNAL_ORIGIN,
    );
  } catch {
    return json({ error: "Invalid url" }, 400);
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
