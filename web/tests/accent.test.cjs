const assert = require("node:assert/strict");
const test = require("node:test");
const { pathToFileURL } = require("node:url");
const path = require("node:path");

const moduleUrl = pathToFileURL(
  path.resolve(__dirname, "../lib/accent.ts"),
).href;

test("profile colors use the configured accent ARGB value", async () => {
  const { accentProfileColor } = await import(moduleUrl);

  assert.equal(accentProfileColor("Orange"), 0xffff8800);
  assert.equal(accentProfileColor("Blue"), 0xff4488ff);
  assert.equal(accentProfileColor("orange"), 0xffff8800);
  assert.equal(accentProfileColor("unknown"), 0xffff8800);
});

test("accent names match the Android palette and migrate legacy names", async () => {
  const { normalizeAccentName } = await import(moduleUrl);

  assert.deepEqual(
    [
      "White",
      "Red",
      "Orange",
      "Yellow",
      "Green",
      "Blue",
      "Indigo",
      "Violet",
    ].map(normalizeAccentName),
    ["White", "Red", "Orange", "Yellow", "Green", "Blue", "Indigo", "Violet"],
  );
  assert.equal(normalizeAccentName("arctic"), "White");
  assert.equal(normalizeAccentName("purple"), "Violet");
  assert.equal(normalizeAccentName("gold"), "Orange");
});
