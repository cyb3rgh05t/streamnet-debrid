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

test("collection-only Marvel, DC and Star Wars addons are hidden from settings", async () => {
  const { normalizeAddons } = await import(moduleUrl);

  assert.deepEqual(
    normalizeAddons([
      {
        id: "com.cyb3rgh05t.marveladdon.custom.marvel-mcu_123456",
        name: "Marvel",
        manifestUrl: "https://marvel.mystreamnet.club/manifest.json",
        manifest: { id: "com.cyb3rgh05t.marveladdon.custom.marvel-mcu" },
      },
      {
        id: "com.joaogonp.marveladdon.custom.marvel-mcu_abcdef",
        name: "Marvel Legacy",
        manifestUrl: "https://old-marvel.example/manifest.json",
        manifest: { id: "com.joaogonp.marveladdon.custom.marvel-mcu" },
      },
      {
        id: "com.joaogonp.marveladdon.custom.marvel-mcu.movies.series_abcdef",
        name: "Marvel Previous",
        manifestUrl: "https://old.example/manifest.json",
        manifest: {
          id: "com.joaogonp.marveladdon.custom.marvel-mcu.movies.series",
        },
      },
      {
        id: "com.cyb3rgh05t.dcaddon.custom.dc-chronological_123456",
        name: "DC Universe",
        manifestUrl: "https://dc.mystreamnet.club/manifest.json",
        manifest: { id: "com.cyb3rgh05t.dcaddon.custom.dc-chronological" },
      },
      {
        id: "com.tapframe.dcaddon.custom.dc-chronological_abcdef",
        name: "DC Universe Legacy",
        manifestUrl: "https://old-dc.example/manifest.json",
        manifest: { id: "com.tapframe.dcaddon.custom.dc-chronological" },
      },
      {
        id: "com.cyb3rgh05t.starwarsaddon.custom.sw-movies-series-chronological_123456",
        name: "Star Wars",
        manifestUrl: "https://starwars.mystreamnet.club/manifest.json",
        manifest: {
          id: "com.cyb3rgh05t.starwarsaddon.custom.sw-movies-series-chronological",
        },
      },
      {
        id: "com.starwars.addon.custom.sw-movies-series-chronological_abcdef",
        name: "Star Wars Legacy",
        manifestUrl: "https://old-starwars.example/manifest.json",
        manifest: {
          id: "com.starwars.addon.custom.sw-movies-series-chronological",
        },
      },
      {
        id: "ordinary-addon",
        name: "Other Addon",
        manifestUrl: "https://addon.example/manifest.json",
      },
    ]).map((addon) => addon.id),
    ["ordinary-addon"],
  );
});
