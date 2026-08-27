import assert from "node:assert/strict";
import test from "node:test";
import { reorderCatalogsByProfile } from "../src/catalog-order.js";

test("reorders known catalogs while retaining custom entries and putting addons last", () => {
  const hidden = { main: ["coming_soon"] };
  const payload = {
    catalogsByProfile: {
      main: [
        { id: "addon_one", sourceType: "ADDON" },
        { id: "trending_tv", sourceType: "MDBLIST" },
        { id: "custom_news", sourceType: "HOME_SERVER" },
        { id: "recent_tv", sourceType: "PREINSTALLED" },
        { id: "trending_movies", sourceType: "MDBLIST" },
        { id: "collection_rail_network", sourceType: "PREINSTALLED" },
        { id: "new_kdramas", sourceType: "MDBLIST" },
        { id: "collection_rail_studio", sourceType: "PREINSTALLED" },
        { id: "addon_two", sourceType: "ADDON" },
      ],
    },
    catalogsUpdatedAtByProfile: { main: 10 },
    hiddenPreinstalledByProfile: hidden,
  };

  const changes = reorderCatalogsByProfile(payload, 1234);

  assert.equal(changes.length, 1);
  assert.deepEqual(
    payload.catalogsByProfile.main.map((catalog) => catalog.id),
    [
      "recent_tv",
      "trending_movies",
      "trending_tv",
      "new_kdramas",
      "collection_rail_studio",
      "collection_rail_network",
      "custom_news",
      "addon_one",
      "addon_two",
    ],
  );
  assert.equal(payload.catalogsUpdatedAtByProfile.main, 1234);
  assert.strictEqual(payload.hiddenPreinstalledByProfile, hidden);
});

test("does not stamp profiles whose order is already current", () => {
  const payload = {
    catalogsByProfile: { main: [{ id: "recent_tv" }, { id: "addon_one" }] },
    catalogsUpdatedAtByProfile: { main: 10 },
  };

  assert.deepEqual(reorderCatalogsByProfile(payload, 1234), []);
  assert.equal(payload.catalogsUpdatedAtByProfile.main, 10);
});
