import { spawn } from "node:child_process";
import { Readable } from "node:stream";
import { NextRequest, NextResponse } from "next/server";
import { safeProxyFetch, withinProxyBudget } from "@/lib/server/safeProxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_HOSTS =
  "xui.streamnet.live,usenetstreamer.mystreamnet.club,85.209.176.85,193.200.221.81,193.108.118.53";
const DEFAULT_MAX_TRANSCODES = 4;
let activeStreams = 0;

function allowedHosts() {
  return new Set(
    (process.env.STREAMNET_AUDIO_TRANSCODE_HOSTS || DEFAULT_HOSTS)
      .split(",")
      .map((host) => host.trim().toLowerCase())
      .filter(Boolean),
  );
}

function maxConcurrentTranscodes() {
  const configured = Number.parseInt(
    process.env.STREAMNET_MAX_AUDIO_TRANSCODES || "",
    10,
  );
  return Number.isFinite(configured) && configured >= 1
    ? Math.min(configured, 16)
    : DEFAULT_MAX_TRANSCODES;
}

export async function GET(request: NextRequest) {
  const client =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!withinProxyBudget(`audio:${client}`))
    return NextResponse.json(
      { error: "Audio conversion request limit reached" },
      { status: 429 },
    );

  let target: URL;
  try {
    target = new URL(new URL(request.url).searchParams.get("url") || "");
  } catch {
    return NextResponse.json({ error: "Invalid stream URL" }, { status: 400 });
  }

  if (activeStreams >= maxConcurrentTranscodes())
    return NextResponse.json(
      { error: "Audio conversion capacity is busy" },
      { status: 503, headers: { "retry-after": "10" } },
    );
  activeStreams += 1;
  let slotReleased = false;
  const releaseSlot = () => {
    if (slotReleased) return;
    slotReleased = true;
    activeStreams = Math.max(0, activeStreams - 1);
  };

  let upstream: Response;
  try {
    upstream = await safeProxyFetch(
      target,
      {
        headers: {
          Accept: "*/*",
          "User-Agent": "VLC/3.0.20 LibVLC/3.0.20",
          "Icy-MetaData": "1",
        },
        signal: request.signal,
      },
      {
        allowMedia: true,
        streamMedia: true,
        allowedHosts: allowedHosts(),
        allowInsecureRedirect: true,
      },
    );
  } catch (error) {
    releaseSlot();
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Stream fetch failed" },
      { status: 502 },
    );
  }
  if (!upstream.ok || !upstream.body) {
    await upstream.body?.cancel();
    releaseSlot();
    return NextResponse.json(
      { error: `IPTV source returned ${upstream.status}` },
      { status: 502 },
    );
  }

  const isHls =
    target.pathname.toLowerCase().endsWith(".m3u8") ||
    (upstream.headers.get("content-type") ?? "")
      .toLowerCase()
      .includes("mpegurl");
  if (isHls) {
    // Validate the target through the SSRF-safe proxy first, but let FFmpeg
    // own the HLS session. Piping a live manifest through stdin freezes the
    // playlist at one snapshot and prevents FFmpeg from reloading segments.
    await upstream.body.cancel().catch(() => undefined);
  }

  const ffmpeg = spawn(
    "ffmpeg",
    isHls
      ? [
          "-hide_banner",
          "-loglevel",
          "error",
          // Xtream HLS segment URLs are opaque tokens without .ts suffixes.
          "-allowed_extensions",
          "ALL",
          "-allowed_segment_extensions",
          "ALL",
          "-extension_picky",
          "0",
          "-protocol_whitelist",
          "file,http,https,tcp,tls,crypto",
          "-reconnect",
          "1",
          "-reconnect_streamed",
          "1",
          "-reconnect_delay_max",
          "2",
          "-live_start_index",
          "-3",
          "-probesize",
          "10000000",
          "-analyzeduration",
          "10000000",
          "-fflags",
          "+genpts+discardcorrupt",
          "-f",
          "hls",
          "-headers",
          "Accept: */*\r\nUser-Agent: VLC/3.0.20 LibVLC/3.0.20\r\nIcy-MetaData: 1\r\n",
          "-i",
          target.toString(),
          "-map",
          "0:v:0?",
          "-map",
          "0:a:0?",
          "-c:v",
          "copy",
          "-c:a",
          "aac",
          "-ac",
          "2",
          "-ar",
          "48000",
          "-b:a",
          "192k",
          "-af",
          "aresample=async=1:first_pts=0:min_hard_comp=0.100000",
          "-f",
          "mpegts",
          "pipe:1",
        ]
      : [
          "-hide_banner",
          "-loglevel",
          "error",
          "-probesize",
          "5000000",
          "-analyzeduration",
          "5000000",
          "-fflags",
          "+genpts+discardcorrupt",
          "-i",
          "pipe:0",
          "-map",
          "0:v:0?",
          "-map",
          "0:a:0?",
          "-c:v",
          "copy",
          "-c:a",
          "aac",
          "-ac",
          "2",
          "-ar",
          "48000",
          "-b:a",
          "192k",
          "-af",
          "aresample=async=1:first_pts=0:min_hard_comp=0.100000",
          "-f",
          "mpegts",
          "pipe:1",
        ],
    { stdio: ["pipe", "pipe", "pipe"] },
  );
  ffmpeg.stderr.on("data", (chunk: Buffer) => {
    const message = chunk
      .toString("utf8")
      .replace(/https?:\/\/[^\s]+/gi, "<upstream-url>")
      .trim();
    if (message) console.warn(`[audio-transcode] ${message}`);
  });
  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    releaseSlot();
    void upstream.body?.cancel().catch(() => undefined);
    if (!ffmpeg.killed) ffmpeg.kill("SIGKILL");
  };
  ffmpeg.once("close", release);
  ffmpeg.once("error", release);
  request.signal.addEventListener("abort", release, { once: true });
  if (isHls) {
    ffmpeg.stdin.end();
  } else {
    Readable.fromWeb(upstream.body as import("node:stream/web").ReadableStream)
      .on("error", release)
      .pipe(ffmpeg.stdin)
      .on("error", release);
  }

  return new Response(Readable.toWeb(ffmpeg.stdout) as ReadableStream, {
    headers: {
      "content-type": "video/mp2t",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });
}
