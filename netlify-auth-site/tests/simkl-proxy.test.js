const assert = require("node:assert/strict");
const test = require("node:test");

process.env.IS_LOCAL_DEV = "true";
process.env.SIMKL_CLIENT_ID = "server-client-id";
process.env.SIMKL_CLIENT_SECRET = "server-client-secret";

const backend = require("../netlify/functions/_backend");

class FakeBlobStore {
  constructor() {
    this.entry = null;
    this.version = 0;
  }

  async getWithMetadata() {
    if (!this.entry) return null;
    return {
      data: structuredClone(this.entry.data),
      etag: this.entry.etag,
      metadata: {}
    };
  }

  async setJSON(_key, data, options) {
    if (options.onlyIfNew && this.entry) return { modified: false };
    if (options.onlyIfMatch && options.onlyIfMatch !== this.entry?.etag) {
      return { modified: false };
    }
    this.version += 1;
    this.entry = { data: structuredClone(data), etag: `v${this.version}` };
    return { modified: true, etag: this.entry.etag };
  }
}

test("Simkl proxy only allows StreamNet's exact API surface and methods", () => {
  const allowed = backend._test.isAllowedSimklRequest;
  assert.equal(allowed("/oauth/pin", "GET"), true);
  assert.equal(allowed("/oauth/pin/ABCD-1234", "GET"), true);
  assert.equal(allowed("/users/settings", "POST"), true);
  assert.equal(allowed("/scrobble/start", "POST"), true);
  assert.equal(allowed("/sync/all-items/anime/all", "GET"), true);
  assert.equal(allowed("/sync/history/remove", "POST"), true);
  assert.equal(allowed("/sync/playback", "GET"), true);
  assert.equal(allowed("/sync/playback/12345", "DELETE"), true);

  assert.equal(allowed("/oauth/pin-evil", "GET"), false);
  assert.equal(allowed("/search/movies", "GET"), false);
  assert.equal(allowed("/sync/all-items/anime/all", "POST"), false);
  assert.equal(allowed("/scrobble/start", "GET"), false);
  assert.equal(allowed("/sync/playback", "DELETE"), false);
  assert.equal(allowed("/sync/playback/12345", "GET"), false);
  assert.equal(allowed("/sync/playback/not-an-id", "DELETE"), false);
});

test("Simkl proxy ignores caller credentials and injects server credentials", async () => {
  const originalFetch = global.fetch;
  let capturedUrl = "";
  try {
    global.fetch = async (url) => {
      capturedUrl = String(url);
      return new Response(JSON.stringify({ user_code: "ABCD" }), {
        status: 200,
        headers: { "content-type": "application/json" }
      });
    };
    const response = await backend.handleSimklProxy({
      httpMethod: "GET",
      headers: {},
      queryStringParameters: {
        path: "/oauth/pin",
        method: "GET",
        client_id: "caller-client-id",
        client_secret: "caller-secret"
      }
    });
    assert.equal(response.statusCode, 200);
    const target = new URL(capturedUrl);
    assert.equal(target.origin, "https://api.simkl.com");
    assert.equal(target.searchParams.get("client_id"), "server-client-id");
    assert.equal(target.searchParams.has("client_secret"), false);
  } finally {
    global.fetch = originalFetch;
  }
});

test("Simkl OAuth token exchange always uses the server secret", async () => {
  const originalFetch = global.fetch;
  let capturedBody = null;
  try {
    global.fetch = async (_url, options) => {
      capturedBody = JSON.parse(options.body);
      return new Response(JSON.stringify({ access_token: "token" }), { status: 200 });
    };
    const response = await backend.handleSimklProxy({
      httpMethod: "POST",
      headers: {},
      queryStringParameters: { path: "/oauth/token", method: "POST" },
      body: JSON.stringify({ code: "code", client_id: "caller", client_secret: "caller" }),
      isBase64Encoded: false
    });
    assert.equal(response.statusCode, 200);
    assert.equal(capturedBody.client_id, "server-client-id");
    assert.equal(capturedBody.client_secret, "server-client-secret");
  } finally {
    global.fetch = originalFetch;
  }
});

test("Simkl proxy rejects a method declared differently from the HTTP request", async () => {
  const response = await backend.handleSimklProxy({
    httpMethod: "GET",
    headers: {},
    queryStringParameters: { path: "/sync/history", method: "POST" }
  });

  assert.equal(response.statusCode, 400);
  assert.deepEqual(JSON.parse(response.body), { error: "HTTP method mismatch" });
});

test("Simkl proxy rate limiting persists counts and resets after one minute", async () => {
  const store = new FakeBlobStore();
  const consume = backend._test.consumeSimklRateLimit;
  const start = Date.parse("2026-08-12T12:00:00.000Z");

  assert.deepEqual(await consume(store, "client", 2, start), {
    exceeded: false,
    remaining: 1,
    resetSeconds: 60
  });
  assert.deepEqual(await consume(store, "client", 2, start + 1_000), {
    exceeded: false,
    remaining: 0,
    resetSeconds: 59
  });
  assert.deepEqual(await consume(store, "client", 2, start + 2_000), {
    exceeded: true,
    remaining: 0,
    resetSeconds: 58
  });
  assert.deepEqual(await consume(store, "client", 2, start + 60_000), {
    exceeded: false,
    remaining: 1,
    resetSeconds: 60
  });
});
