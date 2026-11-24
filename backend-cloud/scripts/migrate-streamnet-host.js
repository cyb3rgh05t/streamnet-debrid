import pg from "pg";
import { config } from "../src/config.js";
import { hostnameOf, migrateStreamNetHost } from "../src/streamnet-host-migration.js";
import { payloadUpdatedAtMillis } from "../src/snapshots.js";

// Moves StreamNet TV playlists from one server to another for all accounts, like the admin panel's
// "change host" action, but from the shell. Without --apply nothing is written.
//   docker compose exec streamnet-backend npm run migrate:streamnet-host -- --from xui.streamnet.live --to https://xyzxyz.streamnet.live
//   docker compose exec -e HOST_MIGRATION_BACKUP_CONFIRMED=1 streamnet-backend npm run migrate:streamnet-host -- --from xui.streamnet.live --to https://xyzxyz.streamnet.live --apply
function option(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const apply = process.argv.includes("--apply");
const fromHostname = hostnameOf(option("--from"));
const toHost = option("--to");
if (!fromHostname || !toHost) {
  throw new Error("Usage: --from <old host> --to <new server URL> [--apply]");
}
if (apply && process.env.HOST_MIGRATION_BACKUP_CONFIRMED !== "1") {
  throw new Error("Apply requires HOST_MIGRATION_BACKUP_CONFIRMED=1 (take a database backup first)");
}

const { Pool } = pg;
const pool = new Pool({ connectionString: config.databaseUrl });
const client = await pool.connect();
const now = Date.now();
let changedAccounts = 0;
let changedProfiles = 0;
let skippedProfiles = 0;

try {
  if (apply) await client.query("begin");
  const result = await client.query(
    `select account_id, payload, revision
       from account_sync_snapshots
      order by account_id${apply ? " for update" : ""}`,
  );
  for (const row of result.rows) {
    const migrated = row.payload ? migrateStreamNetHost(row.payload, fromHostname, toHost, now) : null;
    if (!migrated) continue;
    for (const skip of migrated.skipped) {
      skippedProfiles += 1;
      console.log(JSON.stringify({ accountId: row.account_id, ...skip, skipped: true }));
    }
    if (!migrated.profiles.length) continue;
    changedAccounts += 1;
    changedProfiles += migrated.profiles.length;
    // Hosts only; credentials never appear in the output.
    console.log(JSON.stringify({ accountId: row.account_id, profiles: migrated.profiles, from: fromHostname, to: hostnameOf(toHost) }));
    if (!apply) continue;
    const updated = await client.query(
      `update account_sync_snapshots
          set payload = $2::jsonb, revision = $3,
              payload_updated_at = to_timestamp($4::double precision / 1000.0),
              source = 'admin', updated_at = now()
        where account_id = $1 and revision = $5`,
      [
        row.account_id,
        JSON.stringify(migrated.payload),
        Number(row.revision) + 1,
        payloadUpdatedAtMillis(migrated.payload),
        row.revision,
      ],
    );
    if (updated.rowCount !== 1) throw new Error(`Account ${row.account_id} changed during the run; nothing was written`);
  }
  if (apply) await client.query("commit");
  console.log(
    `${apply ? "Updated" : "Would update"} ${changedAccounts} accounts (${changedProfiles} profiles), skipped ${skippedProfiles} profiles.`,
  );
  if (!apply) console.log("Dry run only. Add --apply (and HOST_MIGRATION_BACKUP_CONFIRMED=1) to write.");
} catch (error) {
  if (apply) await client.query("rollback");
  throw error;
} finally {
  client.release();
  await pool.end();
}
