import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("watch-state reads honor Android pagination parameters", () => {
  const serverSource = readFileSync(
    new URL("../src/server.js", import.meta.url),
    "utf8",
  );

  assert.match(serverSource, /function watchStatePage\(query\)/);
  assert.match(serverSource, /Math\.min\(parsedLimit, 1000\)/);
  assert.match(
    serverSource,
    /order by updated_at desc, id desc limit \$\$\{values\.length - 1\} offset \$\$\{values\.length\}/,
  );
  assert.doesNotMatch(serverSource, /order by updated_at desc limit 5000/);
});
