const assert = require("node:assert/strict");
const test = require("node:test");
const { pathToFileURL } = require("node:url");
const path = require("node:path");

const moduleUrl = pathToFileURL(
  path.resolve(__dirname, "../lib/publicConfig.ts"),
).href;

test("browser settings come from unprefixed server variables and fall back to defaults", async () => {
  const { readPublicConfig } = await import(moduleUrl);
  const defaults = readPublicConfig({});
  assert.equal(defaults.streamnetTvXtreamUrl, "https://xyzxyz.streamnet.live");
  assert.equal(defaults.mediaResolverUrl, "https://resolve.streamnet.live");
  assert.equal(defaults.traktClientId, "");

  const custom = readPublicConfig({
    STREAMNET_TV_XTREAM_URL: "https://live.example/",
    STREAMNET_MEDIA_RESOLVER_URL: "https://worker.example//",
    TRAKT_CLIENT_ID: "trakt-id",
    SIMKL_CLIENT_ID: "simkl-id",
    // The old build-time names are no longer read.
    NEXT_PUBLIC_STREAMNET_TV_XTREAM_URL: "https://old.example",
  });
  assert.equal(custom.streamnetTvXtreamUrl, "https://live.example");
  assert.equal(custom.mediaResolverUrl, "https://worker.example");
  assert.equal(custom.traktClientId, "trakt-id");
  assert.equal(custom.simklClientId, "simkl-id");

  assert.equal(
    readPublicConfig({ STREAMNET_TV_XTREAM_URL: "$UNSET" }).streamnetTvXtreamUrl,
    "https://xyzxyz.streamnet.live",
  );
});

test("serialized settings cannot break out of the inline script", async () => {
  const { serializePublicConfig, readPublicConfig } = await import(moduleUrl);
  const text = serializePublicConfig(
    readPublicConfig({ TRAKT_CLIENT_ID: "</script><script>alert(1)</script>" }),
  );
  assert.ok(!text.includes("<"));
  assert.equal(
    JSON.parse(text).traktClientId,
    "</script><script>alert(1)</script>",
  );
});
