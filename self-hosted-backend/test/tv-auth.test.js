import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const codePattern =
  /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}$/;

test("TV pairing codes use the unambiguous eight-character format", () => {
  assert.equal(codePattern.test("ABCD-2345"), true);
  assert.equal(codePattern.test("O0IL-1234"), false);
});

test("TV pairing consumes a session while returning its original tokens", () => {
  const serverSource = readFileSync(
    new URL("../src/server.js", import.meta.url),
    "utf8",
  );

  assert.match(serverSource, /with approved as materialized/i);
  assert.match(
    serverSource,
    /returning approved\.access_token, approved\.refresh_token, approved\.user_email/i,
  );
  assert.doesNotMatch(
    serverSource,
    /returning access_token, refresh_token, user_email`/i,
  );
});

test("web success page derives pairing mode from the code parameter", () => {
  const serverSource = readFileSync(
    new URL("../src/server.js", import.meta.url),
    "utf8",
  );

  assert.match(
    serverSource,
    /const pairing = Boolean\(new URLSearchParams\(window\.location\.search\)\.get\("code"\)\)/,
  );
  assert.doesNotMatch(
    serverSource,
    /const pairing = text\.includes\("gekoppelt"\)/,
  );
});
