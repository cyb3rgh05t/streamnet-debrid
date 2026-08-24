import Fastify from "fastify";
import { readFile } from "node:fs/promises";
import path from "node:path";
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
const publicDirectory = path.join(process.cwd(), "public");

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

app.get("/assets/:asset", async (request, reply) => {
  const asset = String(request.params.asset || "");
  if (!new Set(["streamnet-logo.svg", "streamnet-icon.svg"]).has(asset)) {
    return reply.code(404).send({ error: "Asset not found" });
  }
  return reply
    .type("image/svg+xml")
    .send(await readFile(path.join(publicDirectory, "assets", asset)));
});

app.get("/", async (request, reply) => {
  const page = await readFile(path.join(publicDirectory, "index.html"), "utf8");
  const selfHostedPage = page
    .replace(
      'const FUNCTION_BASE = "/.netlify/functions";',
      'const FUNCTION_BASE = "";',
    )
    .replaceAll(
      'window.location.href = "https://streamnet-sync.netlify.app";',
      "return;",
    )
    .replaceAll("Angemeldet. Weiterleitung...", "Angemeldet.")
    .replaceAll("TV gekoppelt. Weiterleitung...", "TV gekoppelt.")
    .replaceAll("Konto erstellt. Weiterleitung...", "Konto erstellt.")
    .replaceAll(
      "Konto erstellt und TV gekoppelt. Weiterleitung...",
      "Konto erstellt und TV gekoppelt.",
    )
    .replaceAll("Signed in. Redirecting...", "Signed in.")
    .replaceAll("TV paired. Redirecting...", "TV paired.")
    .replaceAll("Account created. Redirecting...", "Account created.")
    .replaceAll(
      "Account created and TV paired. Redirecting...",
      "Account created and TV paired.",
    )
    .replace(
      "</body>",
      `<script>
        document.getElementById("forgot").style.display = "none";
        document.querySelector(".privacy-link").style.display = "none";
        const statusNode = document.getElementById("status");
        const pageLanguage = () => document.documentElement.lang === "de" ? "de" : "en";
        const showSuccessPage = (pairing) => {
          const german = pageLanguage() === "de";
          const title = pairing
            ? (german ? "TV erfolgreich gekoppelt" : "TV paired successfully")
            : (german ? "Erfolgreich angemeldet" : "Signed in successfully");
          const message = pairing
            ? (german
              ? "Dein Fernseher wurde mit diesem Konto verbunden. Du kannst dieses Fenster jetzt schliessen."
              : "Your TV is now connected to this account. You can close this window.")
            : (german
              ? "Dein StreamNet-Konto ist bereit. Deine Daten bleiben auf deinen Geraeten synchron."
              : "Your StreamNet account is ready. Your data will stay in sync across your devices.");
          document.body.innerHTML = '<style>@keyframes success-pop{0%{transform:scale(.6);opacity:0}70%{transform:scale(1.08)}100%{transform:scale(1);opacity:1}}@keyframes success-draw{0%{width:0;height:0}45%{width:10px;height:0}100%{width:10px;height:22px}}.success-mark{width:64px;height:64px;margin:0 auto 22px;border:2px solid #6ee7a3;border-radius:50%;display:grid;place-items:center;color:#6ee7a3;animation:success-pop .55s ease-out both}.success-mark span{display:block;width:10px;height:22px;border-right:4px solid #6ee7a3;border-bottom:4px solid #6ee7a3;transform:rotate(45deg) translate(-2px,-2px);transform-origin:center;animation:success-draw .55s .25s ease-out both}</style><main style="min-height:calc(100vh - 56px);display:grid;place-items:center"><section style="width:min(560px,100%);padding:42px 34px;text-align:center;background:rgba(28,23,19,.94);border:1px solid rgba(229,162,9,.28);border-radius:18px;box-shadow:0 24px 70px rgba(0,0,0,.38)"><img src="/assets/streamnet-logo.svg" alt="StreamNet TV" style="width:min(260px,80%);height:auto;margin-bottom:34px"><div class="success-mark" aria-label="Success"><span></span></div><h1 style="margin:0;color:#f4efe7;font-size:clamp(28px,5vw,42px);line-height:1.1">' + title + '</h1><p style="margin:18px auto 0;max-width:420px;color:#d6cabb;font-size:16px;line-height:1.6">' + message + '</p><div style="margin-top:30px;color:#e5a209;font-size:12px;letter-spacing:.16em;text-transform:uppercase">StreamNet TV - Cloud Auth</div></section></main>';
        };
        new MutationObserver(() => {
          if (!statusNode || !statusNode.classList.contains("ok")) return;
          const text = statusNode.textContent.toLowerCase();
          const pairing = text.includes("gekoppelt") || text.includes("paired");
          const success = pairing || text.includes("angemeldet") || text.includes("signed in") || text.includes("konto erstellt") || text.includes("account created");
          if (success && document.body.contains(statusNode)) showSuccessPage(pairing);
        }).observe(statusNode, { childList: true, characterData: true, attributes: true, subtree: true });
      </script></body>`,
    );
  return reply.type("text/html; charset=utf-8").send(selfHostedPage);
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

async function completeTvAuth(request, reply) {
  const userCode = String(request.body?.code || "")
    .trim()
    .toUpperCase();
  const email = normalizeAndValidateEmail(request.body?.email);
  const password = String(request.body?.password || "");
  const intent = String(
    request.body?.intent || request.body?.action || "signin",
  )
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
}

app.post("/tv-auth-complete", completeTvAuth);
app.post("/tv-auth-web", completeTvAuth);

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
