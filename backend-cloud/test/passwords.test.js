import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";
import { hashScryptPassword, verifyScryptPassword } from "../src/passwords.js";

function scrypt(password, salt) {
  return new Promise((resolve, reject) => {
    crypto.scrypt(
      password,
      salt,
      64,
      { N: 16384, r: 8, p: 1 },
      (error, derivedKey) => {
        if (error) reject(error);
        else resolve(derivedKey.toString("base64url"));
      },
    );
  });
}

test("verifies existing scrypt password hashes", async () => {
  const salt = "streamnet-test-salt";
  const password = "correct horse battery staple";
  const encoded = `scrypt:16384:8:1:${salt}:${await scrypt(password, salt)}`;

  assert.equal(await verifyScryptPassword(password, encoded), true);
  assert.equal(await verifyScryptPassword("wrong password", encoded), false);
  assert.equal(
    await verifyScryptPassword(
      "password",
      "scrypt:16384:8:1:c2FsdA:ZGVsaWJlcmF0ZWx5LW5vdC1hLXJlYWwtaGFzaA",
    ),
    false,
  );
});

test("creates verifiable scrypt password hashes", async () => {
  const password = "staging test account password";
  const encoded = await hashScryptPassword(password);

  assert.equal(await verifyScryptPassword(password, encoded), true);
});
