const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const callbackSource = fs.readFileSync(
  path.join(__dirname, "..", "discord", "callback.js"),
  "utf8",
);

function createElement() {
  return {
    children: [],
    style: {},
    textContent: "",
    appendChild(child) {
      this.children.push(child);
    },
  };
}

async function runCallback(search, response = { ok: true }) {
  const elements = new Map([
    ["heading", createElement()],
    ["message", createElement()],
    ["code-container", createElement()],
    ["code-val", createElement()],
  ]);
  const fetchCalls = [];
  const location = {
    href: `https://auth.streamnet.club/discord/callback${search}`,
    search,
  };
  const document = {
    getElementById(id) {
      return elements.get(id) || null;
    },
    createElement,
    createTextNode(text) {
      return { textContent: text };
    },
  };
  const context = {
    Boolean,
    JSON,
    URLSearchParams,
    console,
    document,
    encodeURIComponent,
    fetch: async (...args) => {
      fetchCalls.push(args);
      return response;
    },
    window: { location },
  };

  await vm.runInNewContext(callbackSource, context);
  return { elements, fetchCalls, location };
}

test("mobile Discord callback returns to StreamNet TV without notifying the TV backend", async () => {
  const state = `mobile_${"a".repeat(86)}`;
  const result = await runCallback(`?code=mobile-code&state=${state}`);

  assert.equal(result.fetchCalls.length, 0);
  assert.equal(
    result.location.href,
    `arvio://discord/auth?code=mobile-code&state=${state}`,
  );
  assert.match(result.elements.get("heading").textContent, /Discord Connected/);
});

test("TV Discord callback notifies the backend without opening StreamNet TV on the phone", async () => {
  const deviceCode = "b".repeat(43);
  const search = `?code=tv-code&state=tv_${deviceCode}`;
  const result = await runCallback(search);

  assert.equal(result.fetchCalls.length, 1);
  assert.equal(
    result.location.href,
    `https://auth.streamnet.club/discord/callback${search}`,
  );
  assert.deepEqual(JSON.parse(result.fetchCalls[0][1].body), {
    device_code: deviceCode,
    code: "tv-code",
  });
  assert.match(result.elements.get("message").textContent, /TV is connected/);
});

test("unmarked Discord state is rejected instead of guessing the authorization flow", async () => {
  const state = "c".repeat(43);
  const search = `?code=unknown-code&state=${state}`;
  const result = await runCallback(search);

  assert.equal(result.fetchCalls.length, 0);
  assert.equal(
    result.location.href,
    `https://auth.streamnet.club/discord/callback${search}`,
  );
  assert.equal(
    result.elements.get("heading").textContent,
    "Invalid Authorization Session",
  );
});

test("mobile Discord errors return to StreamNet TV with the original state", async () => {
  const state = `mobile_${"d".repeat(86)}`;
  const result = await runCallback(`?error=access_denied&state=${state}`);

  assert.equal(result.fetchCalls.length, 0);
  assert.equal(
    result.location.href,
    `arvio://discord/auth?error=access_denied&state=${state}`,
  );
});
