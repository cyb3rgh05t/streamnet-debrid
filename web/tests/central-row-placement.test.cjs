const assert = require("node:assert/strict");
const test = require("node:test");
const { pathToFileURL } = require("node:url");
const path = require("node:path");

test("a new admin row lands after its anchor in an already saved catalog list", async () => {
  const stored = {
    franchises: [],
    overrides: {
      newRows: [
        {
          id: "top-horror",
          title: "Top Horror",
          url: "https://mdblist.com/lists/someone/top-horror",
          mediaType: "movie",
          after: "trending_movies",
        },
      ],
    },
  };
  globalThis.window = {
    localStorage: {
      getItem: (key) => (key === "streamnet:catalog-config:v2" ? JSON.stringify(stored) : null),
      setItem() {},
    },
  };
  const { defaultCatalogs, mergeCatalogs } = await import(
    pathToFileURL(path.resolve(__dirname, "../lib/catalogs.ts")).href
  );
  const rowId = "central_row_top_horror";
  // The saved list predates the row, like a synced cloud snapshot.
  const saved = defaultCatalogs.map((catalog) => ({ ...catalog }));
  const ids = mergeCatalogs(saved).map((catalog) => catalog.id);

  assert.equal(ids.indexOf(rowId), ids.indexOf("trending_movies") + 1);
  delete globalThis.window;
});
