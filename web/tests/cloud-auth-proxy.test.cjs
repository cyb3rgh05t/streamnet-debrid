const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const filename = path.resolve(__dirname, "../app/api/cloud-auth/[action]/route.ts");
const compiled = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const route = { exports: {} };
new Function("require", "module", "exports", compiled)(
  (name) => {
    if (name !== "next/server") throw new Error(`Unexpected import: ${name}`);
    return { NextResponse: Response };
  }, route, route.exports,
);

test("watch-history proxy preserves profile and exact episode query parameters", async (t) => {
  let forwarded;
  t.mock.method(globalThis, "fetch", async (url) => {
    forwarded = new URL(url);
    return Response.json([]);
  });
  const request = {
    method: "GET", headers: new Headers(),
    nextUrl: new URL("https://web.example/api/cloud-auth/watch-history?profile_id=main&show_tmdb_id=123&media_type=tv&season=2&episode=3"),
  };
  const response = await route.exports.GET(request, {
    params: Promise.resolve({ action: "watch-history" }),
  });
  assert.equal(response.status, 200);
  assert.equal(forwarded.pathname, "/watch-history");
  assert.equal(forwarded.search, request.nextUrl.search);
});
