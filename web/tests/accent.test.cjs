const assert = require("node:assert/strict");
const test = require("node:test");
const { pathToFileURL } = require("node:url");
const path = require("node:path");

const moduleUrl = pathToFileURL(
  path.resolve(__dirname, "../lib/accent.ts"),
).href;

test("profile colors use the configured accent ARGB value", async () => {
  const { accentProfileColor } = await import(moduleUrl);

  assert.equal(accentProfileColor("orange"), 0xffe5a209);
  assert.equal(accentProfileColor("blue"), 0xff3b82f6);
  assert.equal(accentProfileColor("unknown"), 0xffe5a209);
});
