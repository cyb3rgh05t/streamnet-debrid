import assert from "node:assert/strict";
import test from "node:test";
import { normalizeAndValidateEmail } from "../src/email.js";

test("normalizes valid signup emails", () => {
  assert.equal(normalizeAndValidateEmail(" User@Example.DE "), "user@example.de");
});

test("rejects malformed and local-only signup emails", () => {
  assert.equal(normalizeAndValidateEmail("invalid"), null);
  assert.equal(normalizeAndValidateEmail("user@host.local"), null);
  assert.equal(normalizeAndValidateEmail("user@host.test"), null);
});