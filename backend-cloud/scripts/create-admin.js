import pg from "pg";
import { config } from "../src/config.js";
import { normalizeAndValidateEmail } from "../src/email.js";
import { hashScryptPassword } from "../src/passwords.js";

const email = normalizeAndValidateEmail(process.env.STREAMNET_ADMIN_EMAIL);
const password = String(process.env.STREAMNET_ADMIN_PASSWORD || "");
const replacePassword = process.env.STREAMNET_ADMIN_REPLACE_PASSWORD === "1";

if (!email)
  throw new Error("STREAMNET_ADMIN_EMAIL must be a valid email address");
if (password.length < 14) {
  throw new Error(
    "STREAMNET_ADMIN_PASSWORD must contain at least 14 characters",
  );
}

const { Pool } = pg;
const pool = new Pool({ connectionString: config.databaseUrl });
try {
  const passwordHash = await hashScryptPassword(password);
  const result = replacePassword
    ? await pool.query(
        `insert into admin_accounts (email, email_normalized, password_hash)
         values ($1, $1, $2)
         on conflict (email_normalized) do update
           set email = excluded.email, password_hash = excluded.password_hash,
               password_hash_scheme = 'scrypt_v1', disabled_at = null, updated_at = now()
         returning id, email`,
        [email, passwordHash],
      )
    : await pool.query(
        `insert into admin_accounts (email, email_normalized, password_hash)
         values ($1, $1, $2)
         on conflict (email_normalized) do nothing
         returning id, email`,
        [email, passwordHash],
      );
  if (!result.rows[0]) {
    throw new Error(
      "Admin already exists. Set STREAMNET_ADMIN_REPLACE_PASSWORD=1 to replace its password.",
    );
  }
  console.log(`Admin ready: ${result.rows[0].email}`);
} finally {
  await pool.end();
}
