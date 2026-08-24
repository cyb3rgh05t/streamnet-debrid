import fs from "node:fs/promises";
import path from "node:path";
import pg from "pg";
import { config } from "../src/config.js";

const { Pool } = pg;
const pool = new Pool({ connectionString: config.databaseUrl });
const directory = new URL("../migrations/", import.meta.url);

try {
  const files = (await fs.readdir(directory))
    .filter((file) => file.endsWith(".sql"))
    .sort();
  for (const file of files) {
    const alreadyApplied = await pool
      .query("select 1 from schema_migrations where version = $1", [file])
      .catch(() => ({ rows: [] }));
    if (alreadyApplied.rows[0]) continue;
    await pool.query("begin");
    try {
      await pool.query(
        await fs.readFile(path.join(directory.pathname, file), "utf8"),
      );
      await pool.query("insert into schema_migrations (version) values ($1)", [
        file,
      ]);
      await pool.query("commit");
      console.log(`Applied ${file}`);
    } catch (error) {
      await pool.query("rollback");
      throw error;
    }
  }
} finally {
  await pool.end();
}
