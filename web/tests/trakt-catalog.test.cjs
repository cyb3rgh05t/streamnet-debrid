const assert = require("node:assert/strict");
const test = require("node:test");
const { pathToFileURL } = require("node:url");
const path = require("node:path");

const moduleUrl = (name) => pathToFileURL(path.resolve(__dirname, "../lib", name)).href;

async function withTraktRequests(run, clientId = "public-test-client") {
  const { config } = await import(moduleUrl("config.ts"));
  const { loadCatalog } = await import(moduleUrl("tmdb.ts"));
  const { TraktClient } = await import(moduleUrl("trakt.ts"));
  const previous = {
    clientId: config.traktClientId,
    fetch: global.fetch,
    window: global.window,
  };
  config.traktClientId = clientId;
  global.window = { location: { origin: "http://localhost" } };
  try {
    await run({ loadCatalog, client: new TraktClient() });
  } finally {
    config.traktClientId = previous.clientId;
    global.fetch = previous.fetch;
    global.window = previous.window;
  }
}

const horrorCatalog = {
  id: "custom_horror",
  name: "Horror",
  sourceType: "trakt",
  sourceUrl: "https://trakt.tv/users/movistapp/lists/horror",
  enabled: true,
};

test("public Horror list loads directly without login or a working server proxy", async () => {
  await withTraktRequests(async ({ loadCatalog }) => {
    const requests = [];
    global.fetch = async (rawUrl, init) => {
      const url = new URL(rawUrl);
      requests.push(url);
      if (url.hostname === "api.trakt.tv") {
        assert.equal(new Headers(init.headers).has("Authorization"), false);
        assert.equal(url.pathname, "/users/movistapp/lists/horror/items/movie,show");
        assert.equal(url.searchParams.get("limit"), "100");
        return Response.json([
          { type: "movie", movie: { ids: { tmdb: 990001 } } },
          { type: "show", show: { ids: { tmdb: 990002 } } },
        ]);
      }
      if (url.pathname === "/api/tmdb/movie/990001") {
        return Response.json({ id: 990001, title: "Horror Movie" });
      }
      if (url.pathname === "/api/tmdb/tv/990002") {
        return Response.json({ id: 990002, name: "Horror Show" });
      }
      throw new Error(`Unexpected request: ${url.pathname}`);
    };
    const category = await loadCatalog(horrorCatalog, "de-DE");
    assert.deepEqual(category.items.map((item) => item.id), [990001, 990002]);
    assert.deepEqual(category.items.map((item) => item.mediaType), ["movie", "tv"]);
    assert.equal(requests.some((url) => url.pathname.startsWith("/api/trakt/")), false);
  });
});

test("public list falls back to the server proxy when browser transport is blocked", async () => {
  await withTraktRequests(async ({ client }) => {
    const hosts = [];
    global.fetch = async (rawUrl) => {
      const url = new URL(rawUrl);
      hosts.push(url.hostname);
      if (url.hostname === "api.trakt.tv") return new Response("Blocked", { status: 403 });
      assert.equal(url.pathname, "/api/trakt/lists/123/items/movie,show");
      return Response.json([{ movie: { ids: { tmdb: 990003 } } }]);
    };
    assert.equal((await client.publicListItems("123")).length, 1);
    assert.deepEqual(hosts, ["api.trakt.tv", "localhost"]);
  });
});

test("server-only Trakt configuration still supports public catalog loading", async () => {
  await withTraktRequests(async ({ client }) => {
    global.fetch = async (rawUrl) => {
      const url = new URL(rawUrl);
      assert.equal(url.origin, "http://localhost");
      assert.equal(url.pathname, "/api/trakt/users/movistapp/lists/horror/items/movie,show");
      return Response.json([]);
    };
    assert.deepEqual(await client.publicListItems("horror", "movistapp"), []);
  }, "");
});

test("a Trakt transport failure rejects instead of reporting an empty catalog", async () => {
  await withTraktRequests(async ({ loadCatalog }) => {
    global.fetch = async () => Response.json({ error: "Trakt unavailable" }, { status: 503 });
    await assert.rejects(loadCatalog(horrorCatalog), /Trakt unavailable/);
  });
});

test("a genuinely empty Trakt list produces an empty category", async () => {
  await withTraktRequests(async ({ loadCatalog }) => {
    global.fetch = async () => Response.json([]);
    const category = await loadCatalog(horrorCatalog);
    assert.deepEqual(category.items, []);
  });
});

test("Trakt list hydration is capped at 96 titles", async () => {
  await withTraktRequests(async ({ loadCatalog }) => {
    let hydrationRequests = 0;
    global.fetch = async (rawUrl) => {
      const url = new URL(rawUrl);
      if (url.hostname === "api.trakt.tv") {
        return Response.json(Array.from({ length: 100 }, (_, index) => ({
          type: "movie", movie: { ids: { tmdb: 991000 + index } },
        })));
      }
      const match = /^\/api\/tmdb\/movie\/(\d+)$/.exec(url.pathname);
      assert.ok(match);
      hydrationRequests += 1;
      return Response.json({ id: Number(match[1]), title: `Movie ${match[1]}` });
    };
    const category = await loadCatalog(horrorCatalog);
    assert.equal(category.items.length, 96);
    assert.equal(hydrationRequests, 96);
  });
});
