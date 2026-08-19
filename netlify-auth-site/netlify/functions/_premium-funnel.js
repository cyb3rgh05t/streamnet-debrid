const { connectLambda, getStore } = require("@netlify/blobs");
const { privacyHash } = require("./_backend");

const PREMIUM_EVENTS = new Set([
  "paywall_view",
  "account_connected",
  "trial_requested",
  "trial_started",
  "trial_start_failed",
  "checkout_opened",
  "membership_link_started",
  "membership_linked",
  "membership_link_failed",
  "first_playback",
  "subscription_started",
  "subscription_renewed",
  "trial_email_welcome_sent",
  "trial_email_reminder_sent",
  "trial_email_expired_sent"
]);

function premiumFunnelStore(event) {
  connectLambda(event);
  return getStore("premium-funnel");
}

function sanitizeMetadata(metadata) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return {};
  const result = {};
  for (const [key, value] of Object.entries(metadata).slice(0, 8)) {
    if (!/^[a-z][a-z0-9_]{0,31}$/i.test(key)) continue;
    if (typeof value === "boolean" || (typeof value === "number" && Number.isFinite(value))) {
      result[key] = value;
    } else if (typeof value === "string") {
      result[key] = value.replace(/[\r\n]/g, " ").slice(0, 120);
    }
  }
  return result;
}

async function getJSON(store, key) {
  try {
    return await store.get(key, { type: "json", consistency: "strong" });
  } catch (error) {
    if (String(error?.message || "").includes("uncachedEdgeURL")) {
      return store.get(key, { type: "json" }).catch(() => null);
    }
    if (error?.status === 404 || error?.name === "BlobNotFoundError") return null;
    throw error;
  }
}

async function recordPremiumEvent(event, { email, accountId, eventName, metadata = {}, occurredAt } = {}) {
  if (!PREMIUM_EVENTS.has(eventName)) throw new Error("Unsupported premium funnel event");
  // Email is the stable join key shared by ARVIO authentication and Ko-fi.
  // Only its keyed HMAC is stored; the raw address never enters this store.
  const identity = String(email || accountId || "").trim().toLowerCase();
  if (!identity) throw new Error("Premium funnel event requires an account identity");

  const at = occurredAt ? new Date(occurredAt) : new Date();
  if (!Number.isFinite(at.getTime())) throw new Error("Invalid premium funnel event date");
  const date = at.toISOString().slice(0, 10);
  const accountKey = privacyHash("premium-funnel-account", identity);
  const store = premiumFunnelStore(event);
  const key = `events/date/${date}/account/${accountKey}/${eventName}.json`;
  const existing = await getJSON(store, key);
  const record = {
    date,
    eventName,
    accountKey,
    metadata: sanitizeMetadata(metadata),
    count: Number(existing?.count || 0) + 1,
    firstAt: existing?.firstAt || at.toISOString(),
    updatedAt: at.toISOString()
  };
  await store.setJSON(key, record);

  return record;
}

async function listKeys(store, prefix) {
  const keys = [];
  let cursor;
  do {
    const page = await store.list({ prefix, cursor });
    keys.push(...(page.blobs || []).map((blob) => blob.key));
    cursor = page.next_cursor || page.nextCursor || undefined;
  } while (cursor);
  return keys;
}

function dayRange(days) {
  const result = [];
  const today = new Date();
  for (let offset = Math.max(1, days) - 1; offset >= 0; offset -= 1) {
    result.push(new Date(today.getTime() - offset * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
  }
  return result;
}

async function premiumFunnelReport(event, days = 30) {
  const safeDays = Math.min(90, Math.max(1, Number(days) || 30));
  const store = premiumFunnelStore(event);
  const counts = {};
  const unique = {};
  const daily = {};

  for (const date of dayRange(safeDays)) {
    const keys = await listKeys(store, `events/date/${date}/`);
    const dailyCounts = {};
    for (const key of keys) {
      const parts = key.split("/");
      const accountKey = parts[4] || "";
      const eventName = String(parts[5] || "").replace(/\.json$/, "");
      if (!PREMIUM_EVENTS.has(eventName) || !accountKey) continue;
      counts[eventName] = (counts[eventName] || 0) + 1;
      dailyCounts[eventName] = (dailyCounts[eventName] || 0) + 1;
      if (!unique[eventName]) unique[eventName] = new Set();
      unique[eventName].add(accountKey);
    }
    daily[date] = dailyCounts;
  }

  const uniqueAccounts = Object.fromEntries(
    Object.entries(unique).map(([name, accounts]) => [name, accounts.size])
  );
  const connected = uniqueAccounts.account_connected || 0;
  const trials = uniqueAccounts.trial_started || 0;
  const paid = uniqueAccounts.subscription_started || 0;
  return {
    days: safeDays,
    generatedAt: new Date().toISOString(),
    eventDays: counts,
    uniqueAccounts,
    conversion: {
      connectedToTrial: connected ? Number((trials / connected).toFixed(4)) : null,
      trialToPaid: trials ? Number((paid / trials).toFixed(4)) : null
    },
    daily
  };
}

async function cleanupPremiumFunnel(event, retentionDays = 90) {
  const store = premiumFunnelStore(event);
  const cutoff = new Date(Date.now() - Math.max(1, retentionDays) * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  const keys = await listKeys(store, "events/date/");
  const expired = keys.filter((key) => {
    const date = key.split("/")[2] || "";
    return /^\d{4}-\d{2}-\d{2}$/.test(date) && date < cutoff;
  });
  for (const key of expired) await store.delete(key).catch(() => {});
  return expired.length;
}

module.exports = {
  PREMIUM_EVENTS,
  premiumFunnelStore,
  recordPremiumEvent,
  premiumFunnelReport,
  cleanupPremiumFunnel,
  _test: { sanitizeMetadata, dayRange }
};
