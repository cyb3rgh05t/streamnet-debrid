// Read-only measurement for the sync redesign: how big the per-account snapshots are, which sections make
// them big, and how large the row tables already are. Prints sizes and counts only, never content or emails.
//   docker compose exec streamnet-backend node scripts/sync-stats.js
import pg from "pg";
import { config } from "../src/config.js";

const { Pool } = pg;
const pool = new Pool({ connectionString: config.databaseUrl });

const kb = (bytes) => `${(Number(bytes) / 1024).toFixed(1)} KB`;
const pct = (sorted, p) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))] ?? 0;

try {
  const accounts = Number((await pool.query("select count(*) from accounts")).rows[0].count);
  const sizes = (await pool.query(
    `select octet_length(payload::text) as bytes, revision
       from account_sync_snapshots`,
  )).rows;
  const bytes = sizes.map((row) => Number(row.bytes)).sort((a, b) => a - b);
  console.log(`Accounts: ${accounts}, mit Snapshot: ${bytes.length}`);
  if (bytes.length) {
    console.log(
      `Snapshot-Größe  Median ${kb(pct(bytes, 0.5))} · p90 ${kb(pct(bytes, 0.9))} · p99 ${kb(pct(bytes, 0.99))} · ` +
      `max ${kb(bytes.at(-1))} (Limit je Push: 2048 KB)`,
    );
    const over = bytes.filter((value) => value > 1024 * 1024).length;
    console.log(`Über 1 MB: ${over}`);
    const revisions = sizes.map((row) => Number(row.revision)).sort((a, b) => a - b);
    console.log(`Revisionen (Anzahl Schreibvorgänge je Account)  Median ${pct(revisions, 0.5)} · max ${revisions.at(-1)}`);
  }

  // Which top-level sections of the blob are the biggest, summed over all accounts.
  const sections = (await pool.query(
    `select key, sum(octet_length(value::text)) as bytes, count(*) as accounts
       from account_sync_snapshots, jsonb_each(payload)
      group by key order by bytes desc limit 15`,
  )).rows;
  console.log("\nGrößte Abschnitte im Snapshot (Summe über alle Accounts):");
  for (const row of sections) console.log(`  ${row.key.padEnd(40)} ${kb(row.bytes).padStart(12)}  (${row.accounts} Accounts)`);

  const tables = [
    ["watch_history", "account_id"],
    ["watch_state", "account_id"],
    ["device_presence", "account_id"],
    ["app_usage_events", "account_id"],
  ];
  console.log("\nZeilen-Tabellen:");
  for (const [table, column] of tables) {
    try {
      const row = (await pool.query(
        `select count(*) as rows, count(distinct ${column}) as accounts,
                pg_total_relation_size('${table}') as size from ${table}`,
      )).rows[0];
      console.log(`  ${table.padEnd(20)} ${String(row.rows).padStart(8)} Zeilen · ${row.accounts} Accounts · ${kb(row.size)}`);
    } catch (error) {
      console.log(`  ${table.padEnd(20)} nicht lesbar (${error.code || error.message})`);
    }
  }

  const types = (await pool.query(
    "select state_type, count(*) as rows from watch_state group by state_type order by rows desc",
  ).catch(() => ({ rows: [] }))).rows;
  if (types.length) {
    console.log("\nwatch_state nach Typ:");
    for (const row of types) console.log(`  ${String(row.state_type).padEnd(30)} ${row.rows}`);
  }

  // Needs migration 015; the log only fills from the deployment of that version on.
  const pushes = await pool
    .query(
      `select count(*) filter (where outcome = 'accepted') as accepted,
              count(*) filter (where outcome = 'conflict') as conflicts,
              count(distinct account_id) as accounts,
              coalesce(avg(payload_bytes) filter (where outcome = 'accepted'), 0) as avg_bytes,
              coalesce(sum(payload_bytes), 0) as total_bytes,
              min(created_at) as since
         from sync_push_log where created_at > now() - interval '7 days'`,
    )
    .then((result) => result.rows[0])
    .catch((error) => (error.code === "42P01" ? null : Promise.reject(error)));
  console.log("\nSync-Pushes der letzten 7 Tage:");
  if (!pushes) {
    console.log("  Tabelle sync_push_log fehlt – erst `npm run migrate` ausführen.");
  } else if (!Number(pushes.accepted) && !Number(pushes.conflicts)) {
    console.log("  Noch keine Daten (die Messung läuft ab dem Update mit Migration 015).");
  } else {
    const total = Number(pushes.accepted) + Number(pushes.conflicts);
    console.log(`  Seit ${new Date(pushes.since).toISOString()}: ${total} Pushes von ${pushes.accounts} Accounts`);
    console.log(`  Angenommen ${pushes.accepted} · Konflikte (409) ${pushes.conflicts} = ${((Number(pushes.conflicts) / total) * 100).toFixed(1)} %`);
    console.log(`  Ø Push-Größe ${kb(pushes.avg_bytes)} · hochgeladen gesamt ${kb(pushes.total_bytes)}`);

    // Accounts that push far more often than the rest. Short ids only, no emails or content.
    const top = (await pool.query(
      `select left(account_id::text, 8) as id,
              count(*) as pushes,
              count(*) filter (where outcome = 'conflict') as conflicts,
              coalesce(sum(payload_bytes), 0) as bytes,
              min(created_at) as first_at,
              max(created_at) as last_at
         from sync_push_log
        where created_at > now() - interval '24 hours'
        group by account_id
        order by pushes desc
        limit 10`,
    )).rows;
    if (top.length) {
      console.log("\nAuffällige Accounts, letzte 24 Stunden (nach Anzahl Pushes):");
      console.log("  ID        Pushes  pro Std.  409   Upload        erster → letzter Push (UTC)");
      for (const row of top) {
        const spanHours = Math.max((new Date(row.last_at) - new Date(row.first_at)) / 3_600_000, 1);
        const perHour = Number(row.pushes) / spanHours;
        const time = (value) => new Date(value).toISOString().slice(11, 16);
        console.log(
          `  ${row.id}  ${String(row.pushes).padStart(6)}  ${perHour.toFixed(1).padStart(8)}  ` +
          `${String(row.conflicts).padStart(3)}  ${kb(row.bytes).padStart(10)}   ${time(row.first_at)} → ${time(row.last_at)}`,
        );
      }
    }
  }
} finally {
  await pool.end();
}
