const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const test = require("node:test");

const workerUrl = pathToFileURL(
  path.resolve(__dirname, "../src/index.ts"),
).href;
const configuration = readFileSync(
  path.resolve(__dirname, "../wrangler.toml"),
  "utf8",
);
const deployedHosts = configuration.match(
  /^ALLOWED_MEDIA_HOSTS\s*=\s*"([^"]+)"/m,
)?.[1];
assert.ok(deployedHosts, "Deployment must configure allowed media hosts");

const origin = "https://web.streamnet.live";
const target = "http://50.7.184.250/hls/test-channel";
const proxyHeaders = {
  Accept: "*/*",
  "User-Agent": "VLC/3.0.20 LibVLC/3.0.20",
  "Icy-MetaData": "1",
};
const encodedHeaders = btoa(JSON.stringify(proxyHeaders));

function mediaRequest(url, caller = origin) {
  const requestUrl = new URL("https://resolve.streamnet.live/media");
  requestUrl.searchParams.set("url", url);
  requestUrl.searchParams.set("h", encodedHeaders);
  return new Request(requestUrl, { headers: { origin: caller } });
}

for (const [name, env] of [
  ["defaults", {}],
  ["deployment configuration", { ALLOWED_MEDIA_HOSTS: deployedHosts }],
]) {
  test(`Live TV HLS host is relayed with ${name}`, async (t) => {
    const { default: worker } = await import(workerUrl);
    const upstreamFetch = t.mock.method(globalThis, "fetch", async (url, init) => {
      assert.equal(url.toString(), target);
      assert.equal(init.method, "GET");
      assert.equal(init.headers.get("user-agent"), proxyHeaders["User-Agent"]);
      assert.equal(init.headers.get("icy-metadata"), "1");
      return new Response(
        '#EXTM3U\n#EXT-X-KEY:METHOD=AES-128,URI="key.bin"\nvariant.m3u8\nsegment.ts\n',
        { headers: { "content-type": "application/vnd.apple.mpegurl" } },
      );
    });

    const response = await worker.fetch(mediaRequest(target), env);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("access-control-allow-origin"), origin);
    assert.equal(
      response.headers.get("content-type"),
      "application/vnd.apple.mpegurl",
    );
    const lines = (await response.text()).split("\n");
    const keyUrl = lines[1].match(/URI="([^"]+)"/)?.[1];
    assert.ok(keyUrl);
    for (const [relayUrl, upstreamPath] of [
      [keyUrl, "key.bin"],
      [lines[2], "variant.m3u8"],
      [lines[3], "segment.ts"],
    ]) {
      const relay = new URL(relayUrl);
      assert.equal(relay.origin, "https://resolve.streamnet.live");
      assert.equal(relay.pathname, "/media");
      assert.equal(
        relay.searchParams.get("url"),
        `http://50.7.184.250/hls/${upstreamPath}`,
      );
      assert.equal(relay.searchParams.get("h"), encodedHeaders);
    }

    const segment = new Request(lines[3], {
      headers: { origin, range: "bytes=0-2" },
    });
    upstreamFetch.mock.mockImplementation(async (url, init) => {
      assert.equal(url.toString(), "http://50.7.184.250/hls/segment.ts");
      assert.equal(init.headers.get("range"), "bytes=0-2");
      assert.equal(init.headers.get("user-agent"), proxyHeaders["User-Agent"]);
      return new Response("abc", {
        status: 206,
        headers: {
          "content-type": "video/mp2t",
          "content-range": "bytes 0-2/3",
        },
      });
    });
    const segmentResponse = await worker.fetch(segment, env);
    assert.equal(segmentResponse.status, 206);
    assert.equal(segmentResponse.headers.get("content-range"), "bytes 0-2/3");
    assert.equal(await segmentResponse.text(), "abc");
    assert.equal(upstreamFetch.mock.callCount(), 2);
  });

  test(`85.209.176.85 segments are relayed with ${name}`, async (t) => {
    const { default: worker } = await import(workerUrl);
    const segmentUrl = "http://85.209.176.85/hls/test-token";
    const upstreamFetch = t.mock.method(globalThis, "fetch", async (url, init) => {
      assert.equal(url.toString(), segmentUrl);
      assert.equal(init.headers.get("user-agent"), proxyHeaders["User-Agent"]);
      assert.equal(init.headers.get("icy-metadata"), "1");
      return new Response("segment-data", {
        headers: { "content-type": "video/mp2t" },
      });
    });
    const response = await worker.fetch(mediaRequest(segmentUrl), env);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("content-type"), "video/mp2t");
    assert.equal(response.headers.get("access-control-allow-origin"), origin);
    assert.equal(await response.text(), "segment-data");
    assert.equal(upstreamFetch.mock.callCount(), 1);
  });

  test(`All built-in app relay hosts support worker fallback with ${name}`, async (t) => {
    const { default: worker } = await import(workerUrl);
    const upstreamFetch = t.mock.method(globalThis, "fetch", async () =>
      new Response("segment", { headers: { "content-type": "video/mp2t" } }),
    );
    for (const host of [
      "xui.streamnet.live",
      "193.200.221.81",
      "50.7.184.250",
      "85.209.176.85",
      "193.108.118.53",
    ]) {
      const response = await worker.fetch(mediaRequest(`http://${host}/hls/test`), env);
      assert.equal(response.status, 200, host);
      assert.equal(await response.text(), "segment");
    }
    assert.equal(upstreamFetch.mock.callCount(), 5);
  });
}

test("Unknown hosts and disallowed origins remain blocked before upstream fetch", async (t) => {
  const { default: worker } = await import(workerUrl);
  const upstreamFetch = t.mock.method(globalThis, "fetch", async () => {
    throw new Error("Blocked requests must not reach upstream");
  });
  const env = { ALLOWED_MEDIA_HOSTS: deployedHosts };
  const hostResponse = await worker.fetch(
    mediaRequest("http://50.7.184.251/hls/test-channel"),
    env,
  );
  assert.equal(hostResponse.status, 400);
  assert.deepEqual(await hostResponse.json(), { error: "Media host not allowed" });

  const originResponse = await worker.fetch(
    mediaRequest(target, "https://untrusted.example"),
    env,
  );
  assert.equal(originResponse.status, 403);
  assert.deepEqual(await originResponse.json(), { error: "Origin not allowed" });
  assert.equal(upstreamFetch.mock.callCount(), 0);
});
