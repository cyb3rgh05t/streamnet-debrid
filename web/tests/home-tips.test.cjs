const assert = require("node:assert/strict");
const test = require("node:test");
const { pathToFileURL } = require("node:url");
const path = require("node:path");

const moduleUrl = pathToFileURL(
  path.resolve(__dirname, "../lib/homeTips.ts"),
).href;

const fresh = { dismissed: [], hidden: false };
const noneYet = { hasUserAddon: false, hasIptvSource: false };

test("home tips come one at a time and stay closed", async () => {
  const { selectHomeTip } = await import(moduleUrl);
  assert.equal(selectHomeTip(fresh, noneYet), "rows");
  assert.equal(selectHomeTip({ dismissed: ["rows"], hidden: false }, noneYet), "addons");
  assert.equal(
    selectHomeTip({ dismissed: ["rows", "addons", "live_tv"], hidden: false }, noneYet),
    "cloud",
  );
  assert.equal(
    selectHomeTip(
      { dismissed: ["rows", "addons", "live_tv", "cloud"], hidden: false },
      noneYet,
    ),
    null,
  );
});

test("hiding all tips silences them and irrelevant tips are skipped", async () => {
  const { selectHomeTip } = await import(moduleUrl);
  assert.equal(selectHomeTip({ dismissed: [], hidden: true }, noneYet), null);
  assert.equal(
    selectHomeTip(
      { dismissed: ["rows"], hidden: false },
      { hasUserAddon: true, hasIptvSource: false },
    ),
    "live_tv",
  );
  assert.equal(
    selectHomeTip(
      { dismissed: ["rows"], hidden: false },
      { hasUserAddon: true, hasIptvSource: true },
    ),
    "cloud",
  );
});
