import Fastify from "fastify";
import { SignJWT, jwtVerify } from "jose";
import pg from "pg";
import { config } from "./config.js";
import {
  hashToken,
  newRefreshToken,
  verifyLegacyScryptPassword,
} from "./passwords.js";
import { payloadMetrics } from "./snapshots.js";

const { Pool } = pg;
const pool = new Pool({ connectionString: config.databaseUrl });
const jwtKey = new TextEncoder().encode(config.jwtSecret);
const app = Fastify({ logger: true, bodyLimit: 2 * 1024 * 1024 });

async function issueAccessToken(account) {
  return new SignJWT({ email: account.email_normalized, purpose: "access" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(account.id)
    .setIssuedAt()
    .setExpirationTime(`${config.accessTokenTtlSeconds}s`)
    .sign(jwtKey);
}

async function issueSession(account) {
  const refreshToken = newRefreshToken();
  const expiresAt = new Date(
    Date.now() + config.refreshTokenTtlDays * 86_400_000,
  );
  await pool.query(
    "insert into account_sessions (account_id, refresh_token_hash, expires_at) values ($1, $2, $3)",
    [account.id, hashToken(refreshToken), expiresAt],
  );
  return {
    access_token: await issueAccessToken(account),
    refresh_token: refreshToken,
    token_type: "bearer",
    expires_in: config.accessTokenTtlSeconds,
    user: { id: account.id, email: account.email },
  };
}

async function authenticatedAccount(request) {
  const value = request.headers.authorization;
  if (!value?.startsWith("Bearer ")) {
    const error = new Error("Missing bearer token");
    error.statusCode = 401;
    throw error;
  }
  try {
    const { payload } = await jwtVerify(value.slice(7), jwtKey);
    if (payload.purpose !== "access" || !payload.sub)
      throw new Error("Invalid token purpose");
    const result = await pool.query(
      "select id, email, email_normalized from accounts where id = $1",
      [payload.sub],
    );
    if (!result.rows[0]) throw new Error("Unknown account");
    return result.rows[0];
  } catch {
    const error = new Error("Invalid or expired bearer token");
    error.statusCode = 401;
    throw error;
  }
}

app.get("/health", async () => {
  await pool.query("select 1");
  return { ok: true };
});

app.post("/auth-login", async (request, reply) => {
  const email = String(request.body?.email || "")
    .trim()
    .toLowerCase();
  const password = String(request.body?.password || "");
  if (!email || !password)
    return reply.code(400).send({ error: "Email and password are required" });
  const result = await pool.query(
    "select id, email, email_normalized, password_hash, password_hash_scheme from accounts where email_normalized = $1",
    [email],
  );
  const account = result.rows[0];
  if (
    !account?.password_hash ||
    account.password_hash_scheme !== "netlify_scrypt" ||
    !(await verifyLegacyScryptPassword(password, account.password_hash))
  ) {
    return reply.code(401).send({ error: "Invalid email or password" });
  }
  return issueSession(account);
});

app.post("/auth-refresh", async (request, reply) => {
  const refreshToken = String(request.body?.refresh_token || "");
  if (!refreshToken)
    return reply.code(400).send({ error: "refresh_token is required" });
  const client = await pool.connect();
  try {
    await client.query("begin");
    const result = await client.query(
      `select accounts.id, accounts.email, accounts.email_normalized, account_sessions.id as session_id
         from account_sessions join accounts on accounts.id = account_sessions.account_id
        where account_sessions.refresh_token_hash = $1 and account_sessions.revoked_at is null and account_sessions.expires_at > now()
        for update`,
      [hashToken(refreshToken)],
    );
    const account = result.rows[0];
    if (!account) {
      await client.query("rollback");
      return reply.code(401).send({ error: "Invalid refresh token" });
    }
    await client.query(
      "update account_sessions set revoked_at = now() where id = $1",
      [account.session_id],
    );
    const nextRefreshToken = newRefreshToken();
    const expiresAt = new Date(
      Date.now() + config.refreshTokenTtlDays * 86_400_000,
    );
    await client.query(
      "insert into account_sessions (account_id, refresh_token_hash, expires_at) values ($1, $2, $3)",
      [account.id, hashToken(nextRefreshToken), expiresAt],
    );
    await client.query("commit");
    return {
      access_token: await issueAccessToken(account),
      refresh_token: nextRefreshToken,
      token_type: "bearer",
      expires_in: config.accessTokenTtlSeconds,
      user: { id: account.id, email: account.email },
    };
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
});

app.get("/account-sync-pull", async (request) => {
  const account = await authenticatedAccount(request);
  const result = await pool.query(
    "select payload, revision, payload_updated_at, updated_at from account_sync_snapshots where account_id = $1",
    [account.id],
  );
  const snapshot = result.rows[0];
  if (!snapshot)
    return { payload: null, source: null, updatedAt: null, revision: 0 };
  const metrics = payloadMetrics(snapshot.payload);
  return {
    payload: snapshot.payload,
    source: "self_hosted",
    updatedAt: snapshot.updated_at,
    payloadUpdatedAt: snapshot.payload_updated_at,
    revision: Number(snapshot.revision),
    ...metrics,
  };
});

app.post("/account-sync-push", async (request, reply) => {
  const account = await authenticatedAccount(request);
  const payload = request.body?.payload;
  const expectedRevision = request.body?.expectedRevision;
  if (!payload || typeof payload !== "object" || Array.isArray(payload))
    return reply.code(400).send({ accepted: false, reason: "missing_payload" });
  if (
    expectedRevision !== undefined &&
    (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0)
  )
    return reply
      .code(400)
      .send({ accepted: false, reason: "invalid_expected_revision" });
  const client = await pool.connect();
  try {
    await client.query("begin");
    const currentResult = await client.query(
      "select payload, revision from account_sync_snapshots where account_id = $1 for update",
      [account.id],
    );
    const current = currentResult.rows[0];
    const revision = Number(current?.revision || 0);
    if (expectedRevision !== undefined && expectedRevision !== revision) {
      await client.query("rollback");
      return reply
        .code(409)
        .send({
          accepted: false,
          reason: "revision_conflict",
          revision,
          current: current ? { payload: current.payload, revision } : null,
        });
    }
    const nextRevision = revision + 1;
    await client.query(
      `insert into account_sync_snapshots (account_id, payload, revision, payload_updated_at, source)
       values ($1, $2::jsonb, $3, to_timestamp(nullif($4, 0) / 1000.0), 'self_hosted')
       on conflict (account_id) do update set payload = excluded.payload, revision = excluded.revision, payload_updated_at = excluded.payload_updated_at, source = excluded.source, updated_at = now()`,
      [
        account.id,
        JSON.stringify(payload),
        nextRevision,
        Number(payload.updatedAt || 0),
      ],
    );
    await client.query("commit");
    return {
      accepted: true,
      revision: nextRevision,
      ...payloadMetrics(payload),
    };
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
});

app.addHook("onClose", async () => pool.end());
app.listen({ host: "0.0.0.0", port: config.port }).catch((error) => {
  app.log.error(error);
  process.exit(1);
});
