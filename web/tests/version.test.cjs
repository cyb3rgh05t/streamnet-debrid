const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const filename = path.resolve(__dirname, "../app/api/version/route.ts");
const compiled = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText;
const route = { exports: {} };
const webPackage = require("../package.json");
new Function("require", "module", "exports", compiled)(
  (name) => {
    if (name === "next/server") return { NextResponse: Response };
    if (name === "../../../package.json") return webPackage;
    throw new Error(`Unexpected import: ${name}`);
  }, route, route.exports,
);

test("public version endpoint reports the deployed package with no caching or secrets", async () => {
  const response = route.exports.GET();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual(await response.json(), {
    version: webPackage.version,
    build: process.env.NEXT_PUBLIC_BUILD_STAMP || null,
  });
  assert.equal(route.exports.dynamic, "force-dynamic");
});
