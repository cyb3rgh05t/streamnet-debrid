import pg from "pg";
import { config } from "../src/config.js";
import { reorderCatalogsByProfile } from "../src/catalog-order.js";

const apply = process.argv.includes("--apply");
if (
  apply &&
  (process.env.CATALOG_ORDER_APPLY !== "1" ||
    process.env.CATALOG_ORDER_BACKUP_CONFIRMED !== "1")
) {
  throw new Error(
    "Apply requires CATALOG_ORDER_APPLY=1 and CATALOG_ORDER_BACKUP_CONFIRMED=1",
  );
}

const { Pool } = pg;
const pool = new Pool({ connectionString: config.databaseUrl });
const client = await pool.connect();
const now = new Date();
let changedAccounts = 0;
let changedProfiles = 0;

try {
  if (apply) await client.query("begin");
  const result = await client.query(
    `select snapshots.account_id, snapshots.payload, snapshots.revision
       from account_sync_snapshots snapshots
      order by snapshots.account_id${apply ? " for update" : ""}`,
  );

  for (const row of result.rows) {
    const changes = reorderCatalogsByProfile(row.payload, now.getTime());
    if (changes.length === 0) continue;
    changedAccounts += 1;
    changedProfiles += changes.length;
    for (const change of changes) {
      console.log(
        JSON.stringify({ accountId: row.account_id, ...change }),
      );
    }
    if (!apply) continue;
    row.payload.updatedAt = now.toISOString();
    await client.query(
      `update account_sync_snapshots
          set payload = $1::jsonb,
              revision = revision + 1,
              payload_updated_at = $2,
              source = 'catalog_order_migration',
              updated_at = now()
        where account_id = $3 and revision = $4`,
      [JSON.stringify(row.payload), now, row.account_id, row.revision],
    );
  }

  if (apply) await client.query("commit");
  console.log(
    `${apply ? "Updated" : "Would update"} ${changedAccounts} accounts and ${changedProfiles} profiles.`,
  );
} catch (error) {
  if (apply) await client.query("rollback");
  throw error;
} finally {
  client.release();
  await pool.end();
}