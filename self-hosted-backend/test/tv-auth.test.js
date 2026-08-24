import assert from "node:assert/strict";
import test from "node:test";

const codePattern =
  /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}$/;

test("TV pairing codes use the unambiguous eight-character format", () => {
  assert.equal(codePattern.test("ABCD-2345"), true);
  assert.equal(codePattern.test("O0IL-1234"), false);
});
