const assert = require("node:assert/strict");
const test = require("node:test");

process.env.ARVIO_AUTH_SECRET = "test-only-secret-that-is-longer-than-32-bytes";
process.env.APP_ANON_KEY = "test-app-key";

const entitlements = require("../netlify/functions/_entitlements");
const funnel = require("../netlify/functions/_premium-funnel");
const trialEmails = require("../netlify/functions/_trial-emails");

test("new trials last three days while existing records retain their own expiry", () => {
  assert.equal(entitlements.TRIAL_DAYS, 3);
  assert.equal(entitlements.TRIAL_MS, 3 * 24 * 60 * 60 * 1000);
  assert.equal(entitlements.evaluateEntitlement(null).trialDurationDays, 3);

  const expiresAt = new Date(Date.now() + 30_000).toISOString();
  const state = entitlements.evaluateEntitlement({
    status: "active",
    source: "trial",
    expiresAt,
    trialUsed: true
  });
  assert.equal(state.entitled, true);
  assert.equal(state.expiresAt, expiresAt);
});

test("trial email jobs encrypt addresses and produce exactly three service messages", () => {
  const email = "person@example.org";
  const sealed = trialEmails._test.sealEmail(email);
  assert.equal(sealed.includes(email), false);
  assert.equal(trialEmails._test.openEmail(sealed), email);
  assert.deepEqual(trialEmails.JOB_TYPES, ["welcome", "reminder", "expired"]);

  const expiresAt = "2026-08-22T12:00:00.000Z";
  assert.match(trialEmails._test.trialEmailContent("welcome", expiresAt).subject, /3-day/i);
  assert.match(trialEmails._test.trialEmailContent("reminder", expiresAt).subject, /tomorrow/i);
  assert.match(trialEmails._test.trialEmailContent("expired", expiresAt).text, /final email/i);
});

test("premium funnel metadata is bounded and excludes complex values", () => {
  const metadata = funnel._test.sanitizeMetadata({
    source: "website\nspoofed",
    duration_days: 3,
    successful: true,
    nested: { private: "value" },
    "bad key": "ignored"
  });
  assert.deepEqual(metadata, {
    source: "website spoofed",
    duration_days: 3,
    successful: true
  });
});
