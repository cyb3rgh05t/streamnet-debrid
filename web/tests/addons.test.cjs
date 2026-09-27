const assert = require("node:assert/strict");
const test = require("node:test");
const { pathToFileURL } = require("node:url");
const path = require("node:path");

const moduleUrl = pathToFileURL(
  path.resolve(__dirname, "../lib/addons.ts"),
).href;

test("addon enable state stays synchronized across disable and re-enable", async () => {
  const { normalizeAddon, withAddonEnabled } = await import(moduleUrl);
  const addon = normalizeAddon({
    id: "test-addon",
    manifestUrl: "https://addon.example/manifest.json",
    enabled: true,
    isEnabled: true,
  });

  assert.ok(addon);
  const disabled = normalizeAddon(withAddonEnabled(addon, false));
  assert.equal(disabled.enabled, false);
  assert.equal(disabled.isEnabled, false);

  const enabled = normalizeAddon(withAddonEnabled(disabled, true));
  assert.equal(enabled.enabled, true);
  assert.equal(enabled.isEnabled, true);
});
