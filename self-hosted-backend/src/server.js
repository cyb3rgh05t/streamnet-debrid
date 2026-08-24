import Fastify from "fastify";
import { SignJWT, jwtVerify } from "jose";
import pg from "pg";
import { config } from "./config.js";
import {
  hashToken,
  hashLegacyScryptPassword,
  newRefreshToken,
  verifyLegacyScryptPassword,
} from "./passwords.js";
import { normalizeAndValidateEmail } from "./email.js";
import { payloadMetrics, payloadUpdatedAtMillis } from "./snapshots.js";

const { Pool } = pg;
const pool = new Pool({ connectionString: config.databaseUrl });
const jwtKey = new TextEncoder().encode(config.jwtSecret);
const app = Fastify({ logger: true, bodyLimit: 2 * 1024 * 1024 });
const signupAttemptsByEmail = new Map();
const signupCooldownMs = 5 * 60_000;
const tvAuthTtlMs = 10 * 60_000;

function randomCode(length) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}

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

app.get("/", async (request, reply) => {
  const code = String(request.query?.code || "")
    .trim()
    .toUpperCase();
  if (!code) {
    return reply
      .type("text/plain")
      .send("StreamNet TV pairing requires a code.");
  }
  return reply.type("text/html; charset=utf-8").send(`<!doctype html>
<html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>StreamNet TV</title>
<style>body{background:#141414;color:#f5f5f5;font:16px system-ui,sans-serif;margin:0;display:grid;place-items:center;min-height:100vh}main{width:min(420px,calc(100% - 32px))}input,button{box-sizing:border-box;width:100%;padding:13px;margin-top:10px;border-radius:6px;border:1px solid #555;font:inherit}input{background:#222;color:#fff}button{background:#e5a209;color:#161616;border:0;font-weight:700;cursor:pointer}p{color:#bbb}#message{min-height:24px}</style></head>
<body><main><h1>Link StreamNet TV</h1><p>Enter your account details to approve this TV.</p><form id="pair"><input id="email" type="email" autocomplete="email" placeholder="Email" required><input id="password" type="password" autocomplete="current-password" placeholder="Password" required><button type="submit">Sign in and link TV</button></form><p id="message"></p>
<script>const form=document.querySelector('#pair'),message=document.querySelector('#message');form.addEventListener('submit',async event=>{event.preventDefault();message.textContent='Linking TV...';const response=await fetch('/tv-auth-complete',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({code:${JSON.stringify(code)},email:email.value,password:password.value,intent:'signin'})});const body=await response.json().catch(()=>({}));message.textContent=response.ok?'TV linked. You can return to the TV.':body.error||'Could not link TV.';});</script></main></body></html>`);
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

app.post("/cloud-auth-email", async (request, reply) => {
  const email = normalizeAndValidateEmail(request.body?.email);
  const password = String(request.body?.password || "");
  if (!email)
    return reply.code(400).send({ error: "Enter a valid email address" });
  if (password.length < 6) {
    return reply
      .code(400)
      .send({ error: "Password must be at least 6 characters" });
  }
  const now = Date.now();
  const previousAttempt = signupAttemptsByEmail.get(email) || 0;
  if (now - previousAttempt < signupCooldownMs) {
    return reply
      .code(429)
      .send({ error: "Please wait before creating this account again" });
  }
  signupAttemptsByEmail.set(email, now);
  try {
    const result = await pool.query(
      `insert into accounts (email, email_normalized, password_hash, password_hash_scheme)
       values ($1, $2, $3, 'netlify_scrypt')
       returning id, email, email_normalized`,
      [email, email, await hashLegacyScryptPassword(password)],
    );
    return issueSession(result.rows[0]);
  } catch (error) {
    if (error?.code === "23505") {
      return reply
        .code(409)
        .send({ error: "Account already exists. Sign in instead." });
    }
    throw error;
  }
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

app.post("/tv-auth-start", async (_request, reply) => {
  const deviceCode = randomCode(32);
  const userCode = `${randomCode(4)}-${randomCode(4)}`;
  const expiresAt = new Date(Date.now() + tvAuthTtlMs);
  await pool.query(
    "insert into tv_device_auth_sessions (device_code, user_code, expires_at) values ($1, $2, $3)",
    [deviceCode, userCode, expiresAt],
  );
  const verificationUrl = `${config.publicBaseUrl}/?code=${encodeURIComponent(userCode)}`;
  return reply.send({
    device_code: deviceCode,
    user_code: userCode,
    verification_url: verificationUrl,
    verification_uri: verificationUrl,
    expires_in: Math.floor(tvAuthTtlMs / 1000),
    interval: 3,
  });
});

async function tvAuthStatus(request, reply) {
  const deviceCode = String(request.body?.device_code || "").trim();
  if (!deviceCode)
    return reply.code(400).send({ error: "device_code is required" });
  const result = await pool.query(
    "select status, access_token, refresh_token, user_email, expires_at from tv_device_auth_sessions where device_code = $1",
    [deviceCode],
  );
  const session = result.rows[0];
  if (!session || Date.now() > Date.parse(session.expires_at)) {
    if (session)
      await pool.query(
        "delete from tv_device_auth_sessions where device_code = $1",
        [deviceCode],
      );
    return reply.send({ status: "expired", message: "Code expired" });
  }
  if (
    session.status === "approved" &&
    session.access_token &&
    session.refresh_token
  ) {
    await pool.query(
      "update tv_device_auth_sessions set status = 'consumed', consumed_at = now(), access_token = null, refresh_token = null where device_code = $1",
      [deviceCode],
    );
    return reply.send({
      status: "approved",
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      email: session.user_email,
    });
  }
  return reply.send({ status: "pending" });
}

app.post("/tv-auth-status", tvAuthStatus);
app.post("/tv-auth-poll", tvAuthStatus);

app.post("/tv-auth-complete", async (request, reply) => {
  const userCode = String(request.body?.code || "")
    .trim()
    .toUpperCase();
  const email = normalizeAndValidateEmail(request.body?.email);
  const password = String(request.body?.password || "");
  const intent = String(request.body?.intent || "signin")
    .trim()
    .toLowerCase();
  if (!userCode || !email || !password)
    return reply.code(400).send({ error: "Missing required fields" });
  const sessionResult = await pool.query(
    "select device_code, status, expires_at from tv_device_auth_sessions where user_code = $1",
    [userCode],
  );
  const pairing = sessionResult.rows[0];
  if (
    !pairing ||
    pairing.status !== "pending" ||
    Date.now() > Date.parse(pairing.expires_at)
  ) {
    return reply.code(400).send({ error: "Invalid or expired code" });
  }
  let account;
  if (intent === "signup") {
    if (password.length < 6)
      return reply
        .code(400)
        .send({ error: "Password must be at least 6 characters" });
    try {
      const created = await pool.query(
        `insert into accounts (email, email_normalized, password_hash, password_hash_scheme)
         values ($1, $2, $3, 'netlify_scrypt') returning id, email, email_normalized`,
        [email, email, await hashLegacyScryptPassword(password)],
      );
      account = created.rows[0];
    } catch (error) {
      if (error?.code === "23505")
        return reply
          .code(409)
          .send({ error: "Account already exists. Sign in instead." });
      throw error;
    }
  } else {
    const existing = await pool.query(
      "select id, email, email_normalized, password_hash, password_hash_scheme from accounts where email_normalized = $1",
      [email],
    );
    account = existing.rows[0];
    if (
      !account?.password_hash ||
      account.password_hash_scheme !== "netlify_scrypt" ||
      !(await verifyLegacyScryptPassword(password, account.password_hash))
    ) {
      return reply.code(401).send({ error: "Invalid email or password" });
    }
  }
  const tokens = await issueSession(account);
  await pool.query(
    `update tv_device_auth_sessions
        set status = 'approved', approved_at = now(), account_id = $2, user_email = $3, access_token = $4, refresh_token = $5
      where device_code = $1 and status = 'pending'`,
    [
      pairing.device_code,
      account.id,
      account.email,
      tokens.access_token,
      tokens.refresh_token,
    ],
  );
  return reply.send({ ok: true });
});

app.route({
  method: ["GET", "POST"],
  url: "/account-sync-pull",
  handler: async (request) => {
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
  },
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
      return reply.code(409).send({
        accepted: false,
        reason: "revision_conflict",
        revision,
        current: current ? { payload: current.payload, revision } : null,
      });
    }
    const nextRevision = revision + 1;
    await client.query(
      `insert into account_sync_snapshots (account_id, payload, revision, payload_updated_at, source)
       values ($1, $2::jsonb, $3, to_timestamp($4::double precision / 1000.0), 'self_hosted')
       on conflict (account_id) do update set payload = excluded.payload, revision = excluded.revision, payload_updated_at = excluded.payload_updated_at, source = excluded.source, updated_at = now()`,
      [
        account.id,
        JSON.stringify(payload),
        nextRevision,
        payloadUpdatedAtMillis(payload),
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
