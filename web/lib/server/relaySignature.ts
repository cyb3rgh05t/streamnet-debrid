import { createHmac, timingSafeEqual } from "node:crypto";

// Playlists fetched from a trusted StreamNet host name their segments by URL, and those URLs may sit on
// hosts that change (redirect targets, load balancers). The relay signs every URL it writes into a playlist,
// so it can later relay exactly those URLs without an ever-growing host list. The same key is configured in
// the resolver worker (PROXY_SIGNING_KEY); without it nothing is signed and only the host list applies.
const SIGNATURE_LENGTH = 32;

export function relaySigningKey(): string {
  return process.env.PROXY_SIGNING_KEY ?? "";
}

export function signRelayUrl(url: string, key = relaySigningKey()): string {
  if (!key) return "";
  return createHmac("sha256", key)
    .update(url)
    .digest("hex")
    .slice(0, SIGNATURE_LENGTH);
}

export function verifyRelaySignature(
  url: string,
  signature: string | null,
  key = relaySigningKey(),
): boolean {
  if (!key || !signature || signature.length !== SIGNATURE_LENGTH) return false;
  const expected = Buffer.from(signRelayUrl(url, key));
  const actual = Buffer.from(signature);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
