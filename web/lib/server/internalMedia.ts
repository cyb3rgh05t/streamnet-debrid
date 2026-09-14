import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const SECRET =
  process.env.STREAMNET_INTERNAL_MEDIA_SECRET ??
  randomBytes(32).toString("hex");
const MAX_AGE_SECONDS = 10 * 60;

type MediaTarget = {
  url: string;
  headers: Record<string, string>;
  exp: number;
};

function encode(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function decode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signature(payload: string) {
  return createHmac("sha256", SECRET).update(payload).digest("base64url");
}

export function createInternalMediaToken(
  url: string,
  headers: Record<string, string> = {},
) {
  const target: MediaTarget = {
    url,
    headers,
    exp: Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS,
  };
  const payload = encode(JSON.stringify(target));
  return `${payload}.${signature(payload)}`;
}

export function readInternalMediaToken(token: string): MediaTarget | null {
  const [payload, suppliedSignature] = token.split(".");
  if (!payload || !suppliedSignature) return null;
  const expected = signature(payload);
  const supplied = Buffer.from(suppliedSignature, "base64url");
  const actual = Buffer.from(expected, "base64url");
  if (supplied.length !== actual.length || !timingSafeEqual(supplied, actual))
    return null;
  try {
    const target = JSON.parse(decode(payload)) as MediaTarget;
    if (
      !target ||
      typeof target.url !== "string" ||
      !target.url.startsWith("http") ||
      !Number.isFinite(target.exp) ||
      target.exp < Math.floor(Date.now() / 1000)
    )
      return null;
    return {
      url: target.url,
      headers:
        target.headers && typeof target.headers === "object"
          ? target.headers
          : {},
      exp: target.exp,
    };
  } catch {
    return null;
  }
}
