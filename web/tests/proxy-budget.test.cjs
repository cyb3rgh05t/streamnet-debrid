const assert = require("node:assert/strict");
const test = require("node:test");
const { pathToFileURL } = require("node:url");
const path = require("node:path");

const moduleUrl = pathToFileURL(
  path.resolve(__dirname, "../lib/server/safeProxy.ts"),
).href;

test("clients are told apart behind Cloudflare and reverse proxies, not only on Netlify", async () => {
  const { clientIdentity } = await import(moduleUrl);
  assert.equal(clientIdentity(new Headers({ "cf-connecting-ip": "203.0.113.7", "x-forwarded-for": "10.0.0.1" })), "203.0.113.7");
  assert.equal(clientIdentity(new Headers({ "x-nf-client-connection-ip": "198.51.100.2" })), "198.51.100.2");
  assert.equal(clientIdentity(new Headers({ "x-forwarded-for": "192.0.2.9, 10.0.0.1" })), "192.0.2.9");
  assert.equal(clientIdentity(new Headers()), "local");
});

test("one client exhausting its budget does not throttle another", async () => {
  const { withinProxyBudget } = await import(moduleUrl);
  const now = Date.now();
  for (let i = 0; i < 180; i++) assert.equal(withinProxyBudget("budget-a", now), true);
  assert.equal(withinProxyBudget("budget-a", now), false);
  assert.equal(withinProxyBudget("budget-b", now), true);
  // A larger limit applies to the relay bucket; the window resets after a minute.
  for (let i = 0; i < 900; i++) assert.equal(withinProxyBudget("relay:budget-a", now, 900), true);
  assert.equal(withinProxyBudget("relay:budget-a", now, 900), false);
  assert.equal(withinProxyBudget("budget-a", now + 60_000), true);
});
