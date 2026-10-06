const assert = require("node:assert/strict");
const test = require("node:test");
const { pathToFileURL } = require("node:url");
const path = require("node:path");

const moduleUrl = pathToFileURL(
  path.resolve(__dirname, "../lib/server/iptvRelay.ts"),
).href;
const playbackUrl = pathToFileURL(
  path.resolve(__dirname, "../lib/iptvPlayback.ts"),
).href;

test("Configured IPTV segment hosts use the restricted app relay", async () => {
  const { appSegmentRelayUrl, STREAMNET_RELAY_HOSTS } = await import(moduleUrl);
  const headers = btoa(JSON.stringify({
    Accept: "*/*",
    "User-Agent": "VLC/3.0.20 LibVLC/3.0.20",
    "Icy-MetaData": "1",
  }));
  for (const host of ["50.7.184.250", "193.200.221.81", "85.209.176.85"]) {
    for (const protocol of ["http:", "https:"]) {
      const target = new URL(`${protocol}//${host}/hls/test-token?part=2`);
      const relay = appSegmentRelayUrl(target, headers);
      assert.ok(relay);
      const result = new URL(relay, "https://web.streamnet.live");
      assert.equal(result.origin, "https://web.streamnet.live");
      assert.equal(result.pathname, "/api/proxy");
      assert.equal(result.searchParams.get("url"), target.toString());
      assert.equal(result.searchParams.get("headers"), headers);
      assert.equal(result.searchParams.get("rewrite"), "streamnet");
      assert.ok(STREAMNET_RELAY_HOSTS.has(target.hostname));
    }
  }
});

test("App segment relay keeps other hosts and unsupported protocols excluded", async () => {
  const { appSegmentRelayUrl, STREAMNET_RELAY_HOSTS } = await import(moduleUrl);
  for (const target of [
    "http://50.7.184.251/hls/test-token",
    "http://127.0.0.1/hls/test-token",
    "http://localhost/hls/test-token",
    "https://untrusted.example/segment.ts",
    "ftp://50.7.184.250/hls/test-token",
  ]) {
    assert.equal(appSegmentRelayUrl(new URL(target), null), null);
  }
  assert.equal(STREAMNET_RELAY_HOSTS.has("50.7.184.251"), false);
  assert.equal(STREAMNET_RELAY_HOSTS.has("127.0.0.1"), false);
  assert.equal(
    appSegmentRelayUrl(new URL("https://xui.streamnet.live/live/channel.m3u8"), null),
    null,
  );
  for (const host of [
    "xui.streamnet.live",
    "85.209.176.85",
    "193.200.221.81",
    "193.108.118.53",
  ]) {
    assert.ok(STREAMNET_RELAY_HOSTS.has(host));
  }
});

test("App segment relay omits absent headers", async () => {
  const { appSegmentRelayUrl } = await import(moduleUrl);
  const relay = appSegmentRelayUrl(
    new URL("http://50.7.184.250/hls/test-token"),
    null,
  );
  assert.ok(relay);
  const result = new URL(relay, "https://web.streamnet.live");
  assert.equal(result.searchParams.has("headers"), false);
  assert.equal(result.searchParams.get("rewrite"), "streamnet");
});

test("STREAMNET HLS uses the app first and independent resolver fallbacks afterwards", async () => {
  const { streamNetPlaybackAttempts } = await import(playbackUrl);
  const source = "https://xui.streamnet.live/live/user/pass/70223.m3u8";
  const headers = { "User-Agent": "custom-player", Authorization: "test-only" };
  const attempts = streamNetPlaybackAttempts(source, {
    appOrigin: "https://web.streamnet.live",
    resolverUrl: "https://resolve.streamnet.live/",
    headers,
  }).map((url) => new URL(url));
  assert.equal(attempts.length, 3);
  assert.equal(attempts[0].origin, "https://web.streamnet.live");
  assert.equal(attempts[0].searchParams.get("rewrite"), "streamnet");
  assert.equal(attempts[1].origin, "https://web.streamnet.live");
  assert.equal(attempts[1].searchParams.get("rewrite"), "resolver");
  assert.equal(attempts[2].origin, "https://resolve.streamnet.live");
  assert.equal(attempts[2].pathname, "/media");
  for (const attempt of attempts) {
    assert.equal(attempt.searchParams.get("url"), source);
    assert.deepEqual(
      JSON.parse(atob(attempt.searchParams.get("headers") ?? attempt.searchParams.get("h"))),
      headers,
    );
  }
});

test("Live TS test variants preserve tokens and exclude catch-up, VOD and segment URLs", async () => {
  const { xtreamLiveTsVariant } = await import(playbackUrl);
  assert.equal(
    xtreamLiveTsVariant("https://xui.streamnet.live/live/user/pass/527.m3u8?token=test#live"),
    "https://xui.streamnet.live/live/user/pass/527.ts?token=test#live",
  );
  assert.equal(xtreamLiveTsVariant("https://xui.streamnet.live/user/pass/527.ts"),
    "https://xui.streamnet.live/user/pass/527.ts");
  for (const source of [
    "https://xui.streamnet.live/timeshift/user/pass/60/date/527.ts",
    "https://xui.streamnet.live/movie/user/pass/527.m3u8",
    "http://50.7.184.250/hls/token",
  ]) assert.equal(xtreamLiveTsVariant(source), null);
});

test("Xtream TS prefers app HLS then app TS before using the worker", async () => {
  const { streamNetPlaybackAttempts } = await import(playbackUrl);
  const source = "https://xui.streamnet.live/live/user/pass/70223.ts?token=test";
  const hls = source.replace(".ts?", ".m3u8?");
  const attempts = streamNetPlaybackAttempts(source, {
    appOrigin: "https://web.streamnet.live",
    resolverUrl: "https://resolve.streamnet.live",
    headers: {},
  }).map((url) => new URL(url));
  assert.deepEqual(
    attempts.map((url) => [url.pathname, url.searchParams.get("rewrite"), url.searchParams.get("url")]),
    [
      ["/api/proxy", "streamnet", hls],
      ["/api/proxy", "streamnet", source],
      ["/api/proxy", "resolver", hls],
      ["/media", null, hls],
      ["/media", null, source],
    ],
  );
});

test("TS-only live test selects exactly one app TS attempt, preserving tokens", async () => {
  const { streamNetPlaybackAttempts } = await import(playbackUrl);
  for (const extension of ["m3u8", "ts"]) {
    const attempts = streamNetPlaybackAttempts(
      `https://xui.streamnet.live/live/user/pass/527.${extension}?token=test#live`,
      {
        appOrigin: "https://web.streamnet.live",
        resolverUrl: "https://resolve.streamnet.live",
        headers: { "User-Agent": "test-player" },
        liveTsOnly: true,
      },
    );
    assert.equal(attempts.length, 1);
    const relay = new URL(attempts[0]);
    assert.equal(relay.searchParams.get("rewrite"), "streamnet");
    assert.equal(relay.searchParams.get("url"),
      "https://xui.streamnet.live/live/user/pass/527.ts?token=test#live");
    assert.deepEqual(JSON.parse(atob(relay.searchParams.get("headers"))),
      { "User-Agent": "test-player" });
  }
});

test("Combined live playback starts app HLS then app TS for both source formats", async () => {
  const { streamNetPlaybackAttempts } = await import(playbackUrl);
  for (const extension of ["ts", "m3u8"]) {
    const attempts = streamNetPlaybackAttempts(
      `https://xui.streamnet.live/live/user/pass/527.${extension}?token=test#live`,
      {
        appOrigin: "https://web.streamnet.live",
        resolverUrl: "https://resolve.streamnet.live",
        headers: {},
        liveTransportFallback: true,
      },
    ).map((url) => new URL(url));
    assert.equal(attempts[0].searchParams.get("url"),
      "https://xui.streamnet.live/live/user/pass/527.m3u8?token=test#live");
    assert.equal(attempts[1].searchParams.get("url"),
      "https://xui.streamnet.live/live/user/pass/527.ts?token=test#live");
    assert.equal(attempts[1].searchParams.get("rewrite"), "streamnet");
    assert.equal(attempts[2].searchParams.get("rewrite"), "resolver");
  }
});

test("Decoder fallback switches HLS to TS and back only once, even after playback succeeds", async () => {
  const { createLiveTransportFallback } = await import(playbackUrl);
  const next = createLiveTransportFallback();
  assert.equal(next("hls"), 1);
  assert.equal(next("hls"), null);
  assert.equal(next("mpegts"), 0);
  assert.equal(next("mpegts"), null);
  assert.equal(next("hls"), null);
  const tsFirst = createLiveTransportFallback();
  assert.equal(tsFirst("mpegts"), 0);
  assert.equal(tsFirst("hls"), null);
});

test("MSE diagnostics expose only numeric codes and known exceptions, never raw messages", async () => {
  const { mseErrorDiagnostic } = await import(playbackUrl);
  assert.equal(mseErrorDiagnostic({
    code: 11, msg: "InvalidStateError https://secret.example/user/password",
  }), "code=11; exception=InvalidStateError");
  assert.equal(mseErrorDiagnostic({ code: "password", msg: "private-token" }),
    "code=none; exception=unknown");
  assert.equal(mseErrorDiagnostic(null), "unknown");
});

test("Catch-up and VOD use the same app-first order, including without a worker", async () => {
  const { streamNetPlaybackAttempts } = await import(playbackUrl);
  for (const source of [
    "https://xui.streamnet.live/timeshift/user/pass/60/2026-10-06:08-00/70223.ts",
    "https://xui.streamnet.live/movie/user/pass/123.mp4",
    "http://85.209.176.85/hls/test-token",
  ]) {
    const options = {
      appOrigin: "https://web.streamnet.live",
      resolverUrl: "",
      headers: {},
    };
    const primary = streamNetPlaybackAttempts(source, options);
    assert.equal(primary.length, 1);
    assert.equal(new URL(primary[0]).searchParams.get("rewrite"), "streamnet");
    assert.equal(new URL(primary[0]).searchParams.get("url"), source);
    const fallback = streamNetPlaybackAttempts(source, {
      ...options,
      resolverUrl: "https://resolve.streamnet.live",
    });
    assert.equal(fallback.length, 2);
    assert.equal(new URL(fallback[1]).pathname, "/media");
  }
});

test("Only STREAMNET and the configured provider use app-first playback", async () => {
  const { isStreamNetRelayTarget, streamNetRelayHosts, STREAMNET_RELAY_HOSTS } =
    await import(playbackUrl);
  const provider = "https://custom-provider.example";
  for (const host of STREAMNET_RELAY_HOSTS) {
    assert.equal(isStreamNetRelayTarget(`http://${host}/hls/test`, provider), true);
  }
  assert.equal(isStreamNetRelayTarget(`${provider}/live/test.m3u8`, provider), true);
  assert.equal(isStreamNetRelayTarget("https://untrusted.example/live/test.m3u8", provider), false);
  assert.equal(isStreamNetRelayTarget("ftp://85.209.176.85/hls/test", provider), false);
  const allowed = streamNetRelayHosts(provider);
  assert.equal(allowed.has("custom-provider.example"), true);
  assert.equal(allowed.has("untrusted.example"), false);
});

test("Primary playlists relay segments, child playlists, maps and keys through the app", async () => {
  const { rewriteIptvPlaylist } = await import(moduleUrl);
  const base = new URL("http://85.209.176.85/hls/channel.m3u8");
  const headers = btoa(JSON.stringify({ "User-Agent": "VLC/3.0.20" }));
  const playlist = [
    "#EXTM3U",
    '#EXT-X-KEY:METHOD=AES-128,URI="key.bin"',
    '#EXT-X-MAP:URI="init.mp4"',
    '#EXT-X-MEDIA:TYPE=AUDIO,URI="audio.m3u8"',
    "child.m3u8",
    "#EXTINF:9.96,",
    "http://50.7.184.250/hls/test-token",
    "segment.ts",
    'data:application/octet-stream;base64,YWJj',
  ].join("\n");
  const result = rewriteIptvPlaylist(playlist, base, headers, "streamnet");
  assert.ok(result.includes("#EXTINF:9.96,"));
  assert.ok(result.includes("data:application/octet-stream;base64,YWJj"));
  const urls = [
    ...[...result.matchAll(/URI="([^"]+)"/g)].map((match) => match[1]),
    ...result.split("\n").filter((line) => line.startsWith("/api/proxy")),
  ];
  assert.equal(urls.length, 6);
  for (const raw of urls) {
    const url = new URL(raw, "https://web.streamnet.live");
    assert.equal(url.pathname, "/api/proxy");
    assert.equal(url.searchParams.get("rewrite"), "streamnet");
    assert.equal(url.searchParams.get("headers"), headers);
  }
  assert.equal(new URL(urls[0], "https://web.streamnet.live").searchParams.get("url"), "http://85.209.176.85/hls/key.bin");
  assert.ok(urls.some((raw) => new URL(raw, "https://web.streamnet.live").searchParams.get("url") === "http://50.7.184.250/hls/test-token"));
});

test("Resolver fallback never rewrites blocked IP segments back to the app", async () => {
  const { rewriteIptvPlaylist } = await import(moduleUrl);
  const { STREAMNET_RELAY_HOSTS } = await import(playbackUrl);
  const base = new URL("https://xui.streamnet.live/live/channel.m3u8");
  const headers = btoa(JSON.stringify({ "Icy-MetaData": "1" }));
  for (const host of STREAMNET_RELAY_HOSTS) {
    const result = rewriteIptvPlaylist(
      `#EXTM3U\n#EXT-X-KEY:URI="http://${host}/hls/key"\nhttp://${host}/hls/test-token\nchild.m3u8\n`,
      base, headers, "resolver", "https://resolve.streamnet.live",
    );
    const lines = result.split("\n");
    const key = new URL(lines[1].match(/URI="([^"]+)"/)[1]);
    const segment = new URL(lines[2]);
    for (const url of [key, segment]) {
      assert.equal(url.origin, "https://resolve.streamnet.live");
      assert.equal(url.pathname, "/media");
      assert.equal(url.searchParams.get("h"), headers);
    }
    const child = new URL(lines[3], "https://web.streamnet.live");
    assert.equal(child.pathname, "/api/proxy");
    assert.equal(child.searchParams.get("rewrite"), "resolver");
    assert.equal(child.searchParams.get("headers"), headers);
  }
  assert.throws(
    () => rewriteIptvPlaylist("#EXTM3U", base, null, "resolver", ""),
    /not configured/,
  );
});

test("App relay playlist reader enforces the exact 2 MiB limit", async () => {
  const { readIptvPlaylist, IptvPlaylistSizeError } = await import(moduleUrl);
  const limit = 2 * 1024 * 1024;
  const accepted = "a".repeat(limit);
  assert.equal((await readIptvPlaylist(new Response(accepted))).length, limit);
  let cancelled = false;
  let chunks = 0;
  const body = new ReadableStream({
    pull(controller) {
      chunks += 1;
      controller.enqueue(new Uint8Array(chunks === 1 ? limit : 1));
    },
    cancel() { cancelled = true; },
  });
  await assert.rejects(
    readIptvPlaylist(new Response(body)),
    IptvPlaylistSizeError,
  );
  assert.equal(cancelled, true);
  const unicode = "#EXTM3U\n#EXTINF:10,Grüße\nsegment.ts";
  assert.equal(await readIptvPlaylist(new Response(unicode)), unicode);
});

test("Built-in app relay hosts are also allowed by the resolver deployment", async () => {
  const { readFileSync } = require("node:fs");
  const { STREAMNET_RELAY_HOSTS } = await import(playbackUrl);
  const config = readFileSync(
    path.resolve(__dirname, "../../resolver-worker/wrangler.toml"), "utf8",
  );
  const hosts = new Set(config.match(/^ALLOWED_MEDIA_HOSTS\s*=\s*"([^"]+)"/m)[1].split(","));
  for (const host of STREAMNET_RELAY_HOSTS) assert.equal(hosts.has(host), true, host);
});

test("IPTV startup audio decoder failures convert once instead of switching relays", async () => {
  const { iptvStartupRecovery } = await import(playbackUrl);
  const message = "PipelineStatus::DECODER_ERROR_NOT_SUPPORTED: audio decoder initialization failed with DecoderStatus::Codes::kUnsupportedConfig";
  assert.equal(iptvStartupRecovery(undefined, 4, message, false), "audio-transcode");
  assert.equal(iptvStartupRecovery("media", 3, message, false), "audio-transcode");
  assert.equal(iptvStartupRecovery(undefined, 4, message, true), "codec-error");
  assert.equal(iptvStartupRecovery(undefined, 3, "Video decode failure", false), "codec-error");
  assert.equal(iptvStartupRecovery("unsupported", undefined, "", false), "codec-error");
  assert.equal(iptvStartupRecovery("network", undefined, "", false), "relay");
  assert.equal(iptvStartupRecovery(undefined, 2, "", false), "relay");
  assert.equal(iptvStartupRecovery(undefined, undefined, "", false), "relay");
});

test("Visible playback diagnostics identify paths without exposing credentials", async () => {
  const { playbackDiagnostic } = await import(playbackUrl);
  for (const [url, expected] of [
    ["https://web.example/api/proxy?url=http://provider.example/user/secret&rewrite=streamnet&headers=secret", "app-relay"],
    ["https://web.example/api/proxy?rewrite=resolver&url=secret", "manifest-relay"],
    ["https://resolve.example/media?url=secret&h=secret", "resolver"],
    ["/api/transcode/audio?url=secret", "audio-transcode"],
    ["https://provider.example/user/secret", "direct"],
  ]) {
    const result = playbackDiagnostic(url, "frames-timeout", 1, 4);
    assert.ok(result.includes(`Playback: ${expected};`));
    assert.ok(result.includes("reason=frames-timeout"));
    assert.ok(result.includes("readyState=1; mediaError=4"));
    assert.equal(result.includes("secret"), false);
    assert.equal(result.includes("provider.example"), false);
  }
  assert.ok(
    playbackDiagnostic("/api/proxy", "http://secret.example/token", 0)
      .includes("reason=unknown"),
  );
});

test("Decoder diagnostics retain known status tokens but never raw messages", async () => {
  const { playbackDiagnostic } = await import(playbackUrl);
  const result = playbackDiagnostic(
    "/api/proxy?rewrite=streamnet",
    "media-element-error",
    1,
    3,
    "PipelineStatus::PIPELINE_ERROR_DECODE: audio decoder failed with DecoderStatus::Codes::kFailed https://secret.example/private-token",
  );
  assert.ok(result.includes("track=audio"));
  assert.ok(result.includes("pipeline=PIPELINE_ERROR_DECODE"));
  assert.ok(result.includes("decoder=kFailed"));
  assert.equal(result.includes("secret"), false);
  assert.equal(result.includes("private-token"), false);
  const unknown = playbackDiagnostic("/api/proxy", "media-element-error", 1, 3, "https://secret.example");
  assert.ok(unknown.includes("track=unknown"));
  assert.equal(unknown.includes("secret"), false);
});
