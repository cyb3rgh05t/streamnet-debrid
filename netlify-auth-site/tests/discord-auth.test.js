const assert = require("node:assert/strict");
const test = require("node:test");

process.env.ARVIO_AUTH_SECRET = "test-only-secret-that-is-longer-than-32-bytes";
process.env.APP_ANON_KEY = "test-app-key";

const backend = require("../netlify/functions/_backend");

test("Discord pairing endpoints are exported", () => {
  assert.equal(typeof backend.handleDiscordAuthStart, "function");
  assert.equal(typeof backend.handleDiscordAuthStatus, "function");
  assert.equal(typeof backend.handleDiscordAuthCallback, "function");
});

test("Discord pairing validates public identifiers and PKCE input", () => {
  const security = backend._test;
  assert.equal(security.validDiscordClientId("1501197333826637835"), true);
  assert.equal(security.validDiscordClientId("not-a-client"), false);
  assert.equal(security.validDiscordDeviceCode("a".repeat(43)), true);
  assert.equal(security.validDiscordDeviceCode("short"), false);
  assert.equal(security.validPkceChallenge("b".repeat(43)), true);
  assert.equal(security.validPkceChallenge("bad challenge"), false);
});

test("Discord start and status require app authentication", async () => {
  const start = await backend.handleDiscordAuthStart({
    httpMethod: "POST",
    headers: {},
    body: JSON.stringify({
      client_id: "1501197333826637835",
      code_challenge: "a".repeat(43)
    })
  });
  assert.equal(start.statusCode, 401);

  const status = await backend.handleDiscordAuthStatus({
    httpMethod: "POST",
    headers: {},
    body: JSON.stringify({ device_code: "a".repeat(43) })
  });
  assert.equal(status.statusCode, 401);
});

test("Discord callback rejects malformed and oversized values before storage", async () => {
  const badDevice = await backend.handleDiscordAuthCallback({
    httpMethod: "POST",
    headers: {},
    body: JSON.stringify({ device_code: "short", code: "oauth-code" })
  });
  assert.equal(badDevice.statusCode, 400);

  const oversizedCode = await backend.handleDiscordAuthCallback({
    httpMethod: "POST",
    headers: {},
    body: JSON.stringify({ device_code: "a".repeat(43), code: "x".repeat(2049) })
  });
  assert.equal(oversizedCode.statusCode, 400);
});
