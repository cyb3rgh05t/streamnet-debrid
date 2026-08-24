import crypto from "node:crypto";

function scrypt(password, salt, n, r, p) {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 64, { N: n, r, p }, (error, derivedKey) => {
      if (error) reject(error);
      else resolve(derivedKey.toString("base64url"));
    });
  });
}

export async function hashLegacyScryptPassword(password) {
  const salt = crypto.randomBytes(16).toString("base64url");
  const n = 16384;
  const r = 8;
  const p = 1;
  return `scrypt:${n}:${r}:${p}:${salt}:${await scrypt(password, salt, n, r, p)}`;
}

export async function verifyLegacyScryptPassword(password, encoded) {
  const parts = String(encoded || "").split(":");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const [, nRaw, rRaw, pRaw, salt, expected] = parts;
  const n = Number(nRaw);
  const r = Number(rRaw);
  const p = Number(pRaw);
  if (
    !Number.isSafeInteger(n) ||
    !Number.isSafeInteger(r) ||
    !Number.isSafeInteger(p) ||
    !salt ||
    !expected
  )
    return false;
  const actual = await scrypt(password, salt, n, r, p);
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);
  return (
    actualBuffer.length === expectedBuffer.length &&
    crypto.timingSafeEqual(actualBuffer, expectedBuffer)
  );
}

export function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("base64url");
}

export function newRefreshToken() {
  return crypto.randomBytes(48).toString("base64url");
}
