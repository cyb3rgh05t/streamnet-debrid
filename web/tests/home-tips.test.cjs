const assert = require("node:assert/strict");
const test = require("node:test");
const { pathToFileURL } = require("node:url");
const path = require("node:path");

const moduleUrl = pathToFileURL(
  path.resolve(__dirname, "../lib/homeTips.ts"),
).href;

const fresh = { dismissed: [] };
const noneYet = { hasUserAddon: false, hasIptvSource: false };

test("home tips come one at a time and stay closed", async () => {
  const { selectHomeTip } = await import(moduleUrl);
  assert.equal(selectHomeTip(fresh, noneYet), "rows");
  assert.equal(selectHomeTip({ dismissed: ["rows"] }, noneYet), "addons");
  assert.equal(
    selectHomeTip({ dismissed: ["rows", "addons", "live_tv"] }, noneYet),
    "cloud",
  );
  assert.equal(
    selectHomeTip(
      { dismissed: ["rows", "addons", "live_tv", "cloud"] },
      noneYet,
    ),
    null,
  );
});

test("irrelevant tips are skipped", async () => {
  const { selectHomeTip } = await import(moduleUrl);
  assert.equal(
    selectHomeTip(
      { dismissed: ["rows"] },
      { hasUserAddon: true, hasIptvSource: false },
    ),
    "live_tv",
  );
  assert.equal(
    selectHomeTip(
      { dismissed: ["rows"] },
      { hasUserAddon: true, hasIptvSource: true },
    ),
    "cloud",
  );
});
