import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import pg from "pg";
import { config } from "../src/config.js";
import { payloadMetrics } from "../src/snapshots.js";

const exportDirectory = process.argv[2];
if (!exportDirectory) {
  throw new Error(
    "Usage: npm run import:netlify-blobs -- <export directory> [--dry-run]",
  );
}

const dryRun = process.argv.includes("--dry-run");
const authDirectory = path.join(exportDirectory, "auth");
const { Pool } = pg;
const pool = dryRun ? null : new Pool({ connectionString: config.databaseUrl });

function normalizeEmail(email) {
  return String(email || "")
    .trim()
    .toLowerCase();
}

function emailHash(email) {
  return crypto
    .createHash("sha256")
    .update(normalizeEmail(email))
    .digest("hex");
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

async function jsonFiles(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => path.join(directory, entry.name));
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

function newer(candidate, existing) {
  if (!existing) return true;
  const candidateMetrics = payloadMetrics(candidate.payload);
  const existingMetrics = payloadMetrics(existing.payload);
  if (candidateMetrics.restoreRank !== existingMetrics.restoreRank)
    return candidateMetrics.restoreRank > existingMetrics.restoreRank;
  if (candidateMetrics.profileCount !== existingMetrics.profileCount)
    return (
      (candidateMetrics.profileCount || 0) > (existingMetrics.profileCount || 0)
    );
  if (candidateMetrics.scopedCoverage !== existingMetrics.scopedCoverage)
    return candidateMetrics.scopedCoverage > existingMetrics.scopedCoverage;
  return (
    Date.parse(candidate.updatedAt || "") >=
    Date.parse(existing.updatedAt || "")
  );
}

async function main() {
  const authRecords = new Map();
  for (const filePath of await jsonFiles(authDirectory)) {
    const record = await readJson(filePath);
    const email = normalizeEmail(record.email);
    if (!email || !record.accountId || !record.passwordHash) continue;
    if (!isUuid(record.accountId))
      throw new Error(`Invalid accountId in ${path.basename(filePath)}`);
    authRecords.set(email, record);
  }

  const snapshots = new Map();
  for (const filePath of await jsonFiles(exportDirectory)) {
    const fileName = path.basename(filePath);
    const match = fileName.match(/^supabase_([0-9a-f-]{36})\.json$/i);
    const record = await readJson(filePath);
    const accountId = match?.[1]?.toLowerCase();
    const email = normalizeEmail(record.email);
    const matchedAccount = accountId
      ? [...authRecords.values()].find(
          (auth) => auth.accountId.toLowerCase() === accountId,
        )
      : [...authRecords.values()].find(
          (auth) => emailHash(auth.email) === fileName.slice(6, -5),
        );
    const resolvedEmail = email || normalizeEmail(matchedAccount?.email);
    const resolvedAccountId =
      accountId || matchedAccount?.accountId?.toLowerCase();
    if (!resolvedEmail || !resolvedAccountId) continue;
    const candidate = {
      accountId: resolvedAccountId,
      email: resolvedEmail,
      payload: record.payload || record,
      updatedAt: record.updatedAt,
    };
    if (newer(candidate, snapshots.get(resolvedAccountId)))
      snapshots.set(resolvedAccountId, candidate);
  }

  let accountsImported = 0;
  let snapshotsImported = 0;
  for (const [email, account] of authRecords) {
    const snapshot = snapshots.get(account.accountId.toLowerCase());
    accountsImported += 1;
    if (snapshot) snapshotsImported += 1;
    if (dryRun) continue;
    await pool.query(
      `insert into accounts (id, email, email_normalized, password_hash, password_hash_scheme, legacy_supabase_user_id, created_at)
       values ($1::uuid, $2, $3, $4, 'netlify_scrypt', $1::uuid, coalesce($5::timestamptz, now()))
       on conflict (email_normalized) do update set
         password_hash = excluded.password_hash,
         password_hash_scheme = excluded.password_hash_scheme,
         legacy_supabase_user_id = excluded.legacy_supabase_user_id,
         updated_at = now()
       returning id`,
      [
        account.accountId,
        account.email,
        email,
        account.passwordHash,
        account.createdAt || null,
      ],
    );
    if (!snapshot) continue;
    await pool.query(
      `insert into account_sync_snapshots (account_id, payload, revision, payload_updated_at, source)
       values ($1::uuid, $2::jsonb, 1, $3::timestamptz, 'netlify_blob')
       on conflict (account_id) do update set
         payload = excluded.payload,
         payload_updated_at = excluded.payload_updated_at,
         source = excluded.source,
         revision = account_sync_snapshots.revision + 1,
         updated_at = now()`,
      [
        account.accountId,
        JSON.stringify(snapshot.payload),
        snapshot.updatedAt || null,
      ],
    );
  }

  console.log(
    `${dryRun ? "Would import" : "Imported"} ${accountsImported} accounts and ${snapshotsImported} snapshots.`,
  );
}

try {
  await main();
} finally {
  await pool?.end();
}
