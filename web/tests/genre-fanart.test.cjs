const assert = require("node:assert/strict");
const test = require("node:test");
const { pathToFileURL } = require("node:url");
const path = require("node:path");

const moduleUrl = pathToFileURL(
  path.resolve(__dirname, "../lib/genreFanart.ts"),
).href;

test("genre fanart falls back to an empty map when fetch fails", async () => {
  const originalFetch = global.fetch;
  global.fetch = async () => {
    throw new TypeError("Failed to fetch");
  };

  try {
    const { loadGenreFanart } = await import(moduleUrl);
    const fanart = await loadGenreFanart("movie", "de-DE");
    assert.equal(fanart.size, 0);
  } finally {
    global.fetch = originalFetch;
  }
});
