import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import pg from "pg";
import { config } from "../src/config.js";
import { payloadMetrics } from "../src/snapshots.js";

const exportDirectory = process.argv[2];
if (!exportDirectory)
  throw new Error(
    "Usage: npm run import:snapshots -- <Supabase export directory>",
  );
const { Pool } = pg;
const pool = new Pool({ connectionString: config.databaseUrl });
const users = new Map();

async function* rows(fileName) {
  const filePath = path.join(exportDirectory, fileName);
  if (!fs.existsSync(filePath)) return;
  const input = fs.createReadStream(filePath, { encoding: "utf8" });
  for await (const line of readline.createInterface({
    input,
    crlfDelay: Infinity,
  })) {
    if (line.trim()) yield JSON.parse(line);
  }
}

function newer(candidate, existing) {
  if (!existing) return true;
  const candidateMetrics = payloadMetrics(candidate.payload);
  const existingMetrics = payloadMetrics(existing.payload);
  if (candidateMetrics.restoreRank !== existingMetrics.restoreRank)
    return candidateMetrics.restoreRank > existingMetrics.restoreRank;
  if (
    (candidateMetrics.profileCount || 0) !== (existingMetrics.profileCount || 0)
  )
    return (
      (candidateMetrics.profileCount || 0) > (existingMetrics.profileCount || 0)
    );
  if (candidateMetrics.scopedCoverage !== existingMetrics.scopedCoverage)
    return candidateMetrics.scopedCoverage > existingMetrics.scopedCoverage;
  return candidate.updatedAt >= existing.updatedAt;
}

try {
  for await (const user of rows("auth.users.ndjson")) {
    if (user.id && user.email) users.set(user.id, user);
  }
  const candidates = new Map();
  for await (const row of rows("public.account_sync_state.ndjson")) {
    if (row.user_id && row.payload)
      candidates.set(row.user_id, {
        payload: JSON.parse(row.payload),
        updatedAt: row.updated_at || "1970-01-01T00:00:00.000Z",
        source: "account_sync_state",
      });
  }
  for await (const row of rows("public.user_settings.ndjson")) {
    const candidate = row.settings?.accountSyncPayload;
    if (!row.user_id || !candidate) continue;
    const parsed =
      typeof candidate === "string" ? JSON.parse(candidate) : candidate;
    const next = {
      payload: parsed,
      updatedAt:
        row.settings?.accountSyncUpdatedAt ||
        row.updated_at ||
        "1970-01-01T00:00:00.000Z",
      source: "user_settings",
    };
    if (newer(next, candidates.get(row.user_id)))
      candidates.set(row.user_id, next);
  }
  let imported = 0;
  for (const [legacyUserId, candidate] of candidates) {
    const user = users.get(legacyUserId);
    if (!user?.email) continue;
    const account = await pool.query(
      `insert into accounts (email, email_normalized, legacy_supabase_user_id, created_at)
       values ($1, lower($1), $2::uuid, coalesce($3::timestamptz, now()))
       on conflict (email_normalized) do update set legacy_supabase_user_id = excluded.legacy_supabase_user_id
       returning id`,
      [user.email, legacyUserId, user.created_at || null],
    );
    await pool.query(
      `insert into account_sync_snapshots (account_id, payload, revision, payload_updated_at, source)
       values ($1, $2::jsonb, 1, $3::timestamptz, $4)
       on conflict (account_id) do update set payload = excluded.payload, payload_updated_at = excluded.payload_updated_at, source = excluded.source, revision = account_sync_snapshots.revision + 1, updated_at = now()`,
      [
        account.rows[0].id,
        JSON.stringify(candidate.payload),
        candidate.updatedAt,
        `supabase:${candidate.source}`,
      ],
    );
    imported += 1;
  }
  console.log(`Imported ${imported} account snapshots.`);
} finally {
  await pool.end();
}
