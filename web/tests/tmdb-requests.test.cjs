const assert = require("node:assert/strict");
const test = require("node:test");
const { pathToFileURL } = require("node:url");
const path = require("node:path");

const moduleUrl = pathToFileURL(path.resolve(__dirname, "../lib/tmdb.ts")).href;

test("TMDB coalesces only matching in-flight requests and releases completed entries", async () => {
  const originalFetch = global.fetch;
  const originalWindow = global.window;
  global.window = { location: { origin: "http://localhost:3000" } };
  const calls = [];
  let release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  global.fetch = async (url, init) => {
    calls.push({ url, init });
    await gate;
    return Response.json({ id: 42 });
  };
  try {
    const { tmdb } = await import(moduleUrl);
    const requests = [
      tmdb("movie/42", { language: "de-DE", page: 1 }),
      tmdb("/movie/42", { page: 1, language: "de-DE" }),
      tmdb("movie/42", { language: "en-US", page: 1 }),
      tmdb("movie/42", { language: "de-DE", page: 1 }, "custom"),
      tmdb("movie/42", { page: 1, language: "de-DE" }, " custom "),
    ];
    await new Promise(setImmediate);
    assert.equal(calls.length, 3);
    release();
    assert.deepEqual(await Promise.all(requests), Array(5).fill({ id: 42 }));
    await tmdb("movie/42", { language: "de-DE", page: 1 });
    assert.equal(calls.length, 4);
  } finally {
    release();
    global.fetch = originalFetch;
    global.window = originalWindow;
  }
});

test("TMDB failed requests are shared but do not prevent a later retry", async () => {
  const originalFetch = global.fetch;
  const originalWindow = global.window;
  global.window = { location: { origin: "http://localhost:3000" } };
  let calls = 0;
  global.fetch = async () => {
    calls += 1;
    return new Response("Not found", { status: 404 });
  };
  try {
    const { tmdb } = await import(moduleUrl);
    const results = await Promise.allSettled([
      tmdb("movie/404"),
      tmdb("movie/404"),
    ]);
    assert.equal(calls, 1);
    assert.ok(
      results.every(
        (result) =>
          result.status === "rejected" && result.reason.status === 404,
      ),
    );
    global.fetch = async () => {
      calls += 1;
      return Response.json({ id: 404 });
    };
    assert.deepEqual(await tmdb("movie/404"), { id: 404 });
    assert.equal(calls, 2);
  } finally {
    global.fetch = originalFetch;
    global.window = originalWindow;
  }
});
