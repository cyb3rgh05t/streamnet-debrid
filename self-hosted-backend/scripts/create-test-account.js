import pg from "pg";
import { config } from "../src/config.js";
import { hashScryptPassword } from "../src/passwords.js";

const email = String(process.env.TEST_ACCOUNT_EMAIL || "")
  .trim()
  .toLowerCase();
const password = String(process.env.TEST_ACCOUNT_PASSWORD || "");

if (!/^\S+@\S+\.\S+$/.test(email)) {
  throw new Error("TEST_ACCOUNT_EMAIL must be a valid email address");
}
if (password.length < 12) {
  throw new Error("TEST_ACCOUNT_PASSWORD must contain at least 12 characters");
}

const { Pool } = pg;
const pool = new Pool({ connectionString: config.databaseUrl });
try {
  const result = await pool.query(
    `insert into accounts (email, email_normalized, password_hash, password_hash_scheme)
     values ($1, $2, $3, 'scrypt_v1')
     on conflict (email_normalized) do nothing
     returning id, email`,
    [email, email, await hashScryptPassword(password)],
  );
  if (!result.rows[0]) {
    throw new Error(
      "Test account already exists; choose another email instead of overwriting it",
    );
  }
  console.log(
    `Created test account ${result.rows[0].email} (${result.rows[0].id}).`,
  );
} finally {
  await pool.end();
}
