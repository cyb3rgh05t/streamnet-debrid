import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";
import {
  hashLegacyScryptPassword,
  verifyLegacyScryptPassword,
} from "../src/passwords.js";

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

test("verifies the Netlify scrypt password format", async () => {
  const salt = "streamnet-test-salt";
  const password = "correct horse battery staple";
  const encoded = `scrypt:16384:8:1:${salt}:${await scrypt(password, salt)}`;

  assert.equal(await verifyLegacyScryptPassword(password, encoded), true);
  assert.equal(
    await verifyLegacyScryptPassword("wrong password", encoded),
    false,
  );
  assert.equal(
    await verifyLegacyScryptPassword(
      "password",
      "scrypt:16384:8:1:c2FsdA:ZGVsaWJlcmF0ZWx5LW5vdC1hLXJlYWwtaGFzaA",
    ),
    false,
  );
});

test("creates hashes compatible with Netlify scrypt verification", async () => {
  const password = "staging test account password";
  const encoded = await hashLegacyScryptPassword(password);

  assert.equal(await verifyLegacyScryptPassword(password, encoded), true);
});
