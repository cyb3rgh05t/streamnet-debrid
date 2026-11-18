const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const moduleUrl = pathToFileURL(path.resolve(__dirname, "../lib/catalogs.ts")).href;
const contractFile = path.resolve(__dirname, "../../catalog-contract/standard-catalogs.txt");

// Must render exactly like app/src/test/.../StandardCatalogContractTest.kt.
function contractSources(sources) {
  const curatedGroups = new Map();
  const others = [];
  for (const source of sources ?? []) {
    switch (source.kind) {
      case "CURATED_IDS": {
        const fallback = Boolean(source.addonFallback);
        curatedGroups.set(fallback, [...(curatedGroups.get(fallback) ?? []), ...(source.curatedRefs ?? [])]);
        break;
      }
      case "ADDON_CATALOG":
        others.push(`addon:${source.addonCatalogType}/${source.addonCatalogId}@${source.collectionTab ?? ""}@${source.addonManifestUrl ?? ""}`);
        break;
      case "TMDB_COLLECTION": others.push(`tmdbCollection:${source.tmdbCollectionId}`); break;
      case "TMDB_GENRE": others.push(`genre:${source.tmdbGenreId}:${source.mediaType ?? ""}`); break;
      case "TMDB_KEYWORD": others.push(`keyword:${source.tmdbKeywordId}:${source.mediaType ?? ""}`); break;
      case "TMDB_WATCH_PROVIDER": others.push(`provider:${source.tmdbWatchProviderId}:${source.mediaType ?? ""}`); break;
      case "MDBLIST_PUBLIC": others.push(`mdblist:${source.mdblistSlug}`); break;
      default: others.push(String(source.kind));
    }
  }
  const curated = [...curatedGroups.entries()].map(([fallback, refs]) =>
    `curated${fallback ? "+fallback" : ""}:${[...new Set(refs)].sort(compareCodePoints).join(",")}`,
  );
  return [...curated, ...others].sort(compareCodePoints);
}

// Kotlin's String ordering is by UTF-16 code unit, like this.
function compareCodePoints(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

function contractLine(catalog) {
  return [
    catalog.id,
    catalog.title ?? catalog.name ?? "",
    catalog.kind ?? "STANDARD",
    catalog.collectionGroup ?? "",
    catalog.sourceUrl ?? "",
    contractSources(catalog.collectionSources).join(" ; "),
  ].join(" | ");
}

test("web standard catalogs match the shared contract with the Android app", async () => {
  const { defaultCatalogs } = await import(moduleUrl);
  const actual = defaultCatalogs.map(contractLine).join("\n") + "\n";
  if (process.env.UPDATE_CATALOG_CONTRACT === "1") {
    fs.mkdirSync(path.dirname(contractFile), { recursive: true });
    fs.writeFileSync(contractFile, actual);
  }
  const expected = fs.readFileSync(contractFile, "utf8").replace(/\r\n/g, "\n");
  assert.equal(
    actual,
    expected,
    "Standard catalogs differ from catalog-contract/standard-catalogs.txt. If intended, run the Android and web tests with UPDATE_CATALOG_CONTRACT=1 and apply the same change to the Android manifest.",
  );
});
