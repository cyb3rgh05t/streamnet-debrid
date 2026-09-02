import Fastify from "fastify";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { SignJWT, jwtVerify } from "jose";
import pg from "pg";
import { config } from "./config.js";
import {
  hashToken,
  hashScryptPassword,
  newRefreshToken,
  verifyScryptPassword,
} from "./passwords.js";
import { normalizeAndValidateEmail } from "./email.js";
import { payloadMetrics, payloadUpdatedAtMillis } from "./snapshots.js";
import { backendLoggerOptions, registerRequestLogging } from "./logger.js";
import { deleteAccountData } from "./account-deletion.js";
import { isValidWatchHistoryIdentity } from "./watch-history.js";

const { Pool } = pg;
const pool = new Pool({ connectionString: config.databaseUrl });
const jwtKey = new TextEncoder().encode(config.jwtSecret);
const app = Fastify({
  logger: backendLoggerOptions(),
  disableRequestLogging: true,
  bodyLimit: 2 * 1024 * 1024,
});
registerRequestLogging(app);
const signupAttemptsByEmail = new Map();
const signupCooldownMs = 5 * 60_000;
const tvAuthTtlMs = 10 * 60_000;
const publicDirectory = path.join(process.cwd(), "public");
const deletionReceipts = new Map();

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

function watchHistoryKey({
  profile_id: profileId,
  profileId: camelProfileId,
  media_type: mediaType,
  mediaType: camelMediaType,
  show_tmdb_id: showTmdbId,
  showTmdbId: camelShowTmdbId,
  season,
  episode,
}) {
  return [
    String(profileId ?? camelProfileId ?? "default"),
    String(mediaType ?? camelMediaType ?? ""),
    String(showTmdbId ?? camelShowTmdbId ?? ""),
    String(season ?? ""),
    String(episode ?? ""),
  ].join("|");
}

function watchHistoryPayload(row) {
  return {
    ...row.payload,
    id: row.id,
    user_id: row.payload.user_id,
    profile_id: row.profile_id,
    media_type: row.media_type,
    show_tmdb_id: row.show_tmdb_id,
    season: row.season,
    episode: row.episode,
    updated_at: row.updated_at,
  };
}

app.get("/watch-history", async (request) => {
  const account = await authenticatedAccount(request);
  const query = request.query || {};
  const values = [account.id];
  const filters = ["account_id = $1"];
  if (query.profile_id) {
    values.push(String(query.profile_id));
    filters.push(`profile_id = $${values.length}`);
  }
  if (query.show_tmdb_id) {
    values.push(Number(query.show_tmdb_id));
    filters.push(`show_tmdb_id = $${values.length}`);
  }
  if (query.media_type) {
    values.push(String(query.media_type));
    filters.push(`media_type = $${values.length}`);
  }
  if (query.season !== undefined && query.season !== "") {
    values.push(Number(query.season));
    filters.push(`season = $${values.length}`);
  }
  if (query.episode !== undefined && query.episode !== "") {
    values.push(Number(query.episode));
    filters.push(`episode = $${values.length}`);
  }
  const result = await pool.query(
    `select id, payload, profile_id, media_type, show_tmdb_id, season, episode, updated_at
       from watch_history
      where ${filters.join(" and ")}
      order by updated_at desc
      limit 500`,
    values,
  );
  return result.rows.map(watchHistoryPayload);
});

app.post("/watch-history", async (request, reply) => {
  const account = await authenticatedAccount(request);
  const body = request.body || {};
  const mediaType = String(body.media_type || "").trim();
  const showTmdbId = Number(body.show_tmdb_id);
  if (!isValidWatchHistoryIdentity(body))
    return reply
      .code(400)
      .send({ error: "media_type and show_tmdb_id are required" });
  const profileId = String(body.profile_id || "default");
  const historyKey = watchHistoryKey(body);
  const result = await pool.query(
    `insert into watch_history (
       account_id, history_key, profile_id, media_type, show_tmdb_id,
       season, episode, payload, updated_at
     ) values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, now())
     on conflict (account_id, history_key) do update set
       payload = excluded.payload,
       profile_id = excluded.profile_id,
       media_type = excluded.media_type,
       show_tmdb_id = excluded.show_tmdb_id,
       season = excluded.season,
       episode = excluded.episode,
       updated_at = now()
     returning id, payload, profile_id, media_type, show_tmdb_id, season, episode, updated_at`,
    [
      account.id,
      historyKey,
      profileId,
      mediaType,
      showTmdbId,
      body.season ?? null,
      body.episode ?? null,
      JSON.stringify(body),
    ],
  );
  return watchHistoryPayload(result.rows[0]);
});

app.delete("/watch-history", async (request, reply) => {
  const account = await authenticatedAccount(request);
  const query = request.query || {};
  const values = [account.id];
  const filters = ["account_id = $1"];
  for (const [name, expression] of [
    ["profile_id", "profile_id ="],
    ["media_type", "media_type ="],
    ["show_tmdb_id", "show_tmdb_id ="],
    ["season", "season ="],
    ["episode", "episode ="],
  ]) {
    if (query[name] === undefined || query[name] === "") continue;
    values.push(
      name === "show_tmdb_id" || name === "season" || name === "episode"
        ? Number(query[name])
        : String(query[name]),
    );
    filters.push(`${expression} $${values.length}`);
  }
  await pool.query(
    `delete from watch_history where ${filters.join(" and ")}`,
    values,
  );
  return reply.code(204).send();
});

function stateQueryValue(value) {
  const raw = String(value ?? "");
  return raw.startsWith("eq.") ? raw.slice(3) : raw;
}

function watchStateKey(type, body) {
  if (type === "watched_movies") {
    return `${body.profile_id || "default"}|${body.tmdb_id}`;
  }
  if (type === "watched_episodes") {
    return `${body.profile_id || "default"}|${body.tmdb_id}|${body.season}|${body.episode}`;
  }
  return String(body.profile_id || "default");
}

function watchStateProfile(query) {
  return stateQueryValue(query.profile_id);
}

async function readWatchState(type, request) {
  const account = await authenticatedAccount(request);
  const query = request.query || {};
  const values = [account.id, type];
  const filters = ["account_id = $1", "state_type = $2"];
  const fields =
    type === "watched_movies"
      ? [
          ["profile_id", "profile_id"],
          ["tmdb_id", "(payload->>'tmdb_id')::integer"],
        ]
      : type === "watched_episodes"
        ? [
            ["profile_id", "profile_id"],
            ["tmdb_id", "(payload->>'tmdb_id')::integer"],
            ["season", "(payload->>'season')::integer"],
            ["episode", "(payload->>'episode')::integer"],
          ]
        : [["profile_id", "profile_id"]];
  for (const [queryName, column] of fields) {
    if (query[queryName] === undefined || query[queryName] === "") continue;
    values.push(
      Number.isNaN(Number(stateQueryValue(query[queryName])))
        ? stateQueryValue(query[queryName])
        : Number(stateQueryValue(query[queryName])),
    );
    filters.push(`${column} = $${values.length}`);
  }
  const result = await pool.query(
    `select payload from watch_state where ${filters.join(" and ")} order by updated_at desc limit 5000`,
    values,
  );
  return result.rows.map((row) => row.payload);
}

async function writeWatchState(type, request) {
  const account = await authenticatedAccount(request);
  const records = Array.isArray(request.body)
    ? request.body
    : [request.body || {}];
  for (const payload of records) {
    const profileId = String(payload.profile_id || "default");
    await pool.query(
      `insert into watch_state (account_id, state_type, state_key, profile_id, payload, updated_at)
       values ($1, $2, $3, $4, $5::jsonb, now())
       on conflict (account_id, state_type, state_key) do update set payload = excluded.payload, profile_id = excluded.profile_id, updated_at = now()`,
      [
        account.id,
        type,
        watchStateKey(type, payload),
        profileId,
        JSON.stringify(payload),
      ],
    );
  }
  return { accepted: true };
}

async function deleteWatchState(type, request, reply) {
  const account = await authenticatedAccount(request);
  const query = request.query || {};
  const values = [account.id, type];
  const filters = ["account_id = $1", "state_type = $2"];
  for (const [name, expression] of [
    ["profile_id", "profile_id"],
    ["tmdb_id", "(payload->>'tmdb_id')::integer"],
    ["season", "(payload->>'season')::integer"],
    ["episode", "(payload->>'episode')::integer"],
  ]) {
    if (query[name] === undefined || query[name] === "") continue;
    values.push(
      Number(stateQueryValue(query[name])) || stateQueryValue(query[name]),
    );
    filters.push(`${expression} = $${values.length}`);
  }
  await pool.query(
    `delete from watch_state where ${filters.join(" and ")}`,
    values,
  );
  return reply.code(204).send();
}

for (const [type, pathName] of [
  ["watched_movies", "watched-movies"],
  ["watched_episodes", "watched-episodes"],
  ["sync_state", "sync-state"],
]) {
  app.get(`/watch-state/${pathName}`, (request) =>
    readWatchState(type, request),
  );
  app.post(`/watch-state/${pathName}`, (request) =>
    writeWatchState(type, request),
  );
  app.delete(`/watch-state/${pathName}`, (request, reply) =>
    deleteWatchState(type, request, reply),
  );
}

app.post("/app-usage-event", async (request, reply) => {
  const body = request.body || {};
  const eventName = String(body.event_name || "").trim();
  const installId = String(body.install_id || "").trim();
  if (!eventName || !installId)
    return reply
      .code(400)
      .send({ error: "event_name and install_id are required" });
  const rawAccountId = String(body.user_id || "").trim();
  const accountId =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      rawAccountId,
    )
      ? rawAccountId
      : "";
  await pool.query(
    `insert into app_usage_events
       (event_name, install_id, account_id, email, profile_id, platform, device_type, app_version, app_version_code, distribution, metadata)
     values ($1, $2, nullif($3, '')::uuid, nullif($4, ''), nullif($5, ''), nullif($6, ''), nullif($7, ''), nullif($8, ''), $9, nullif($10, ''), $11::jsonb)`,
    [
      eventName,
      installId,
      accountId,
      String(body.email || "").trim(),
      String(body.profile_id || "").trim(),
      String(body.platform || "").trim(),
      String(body.device_type || "").trim(),
      String(body.app_version || "").trim(),
      Number.isSafeInteger(body.app_version_code)
        ? body.app_version_code
        : null,
      String(body.distribution || "").trim(),
      JSON.stringify(
        body.metadata && typeof body.metadata === "object" ? body.metadata : {},
      ),
    ],
  );
  return reply.send({ ok: true });
});

app.get("/assets/:asset", async (request, reply) => {
  const asset = String(request.params.asset || "");
  if (
    !new Set([
      "streamnet-logo.svg",
      "streamnet-club-logo.svg",
      "streamnet-icon.svg",
    ]).has(asset)
  ) {
    return reply.code(404).send({ error: "Asset not found" });
  }
  const servedAsset =
    asset === "streamnet-logo.svg" ? "streamnet-club-logo.svg" : asset;
  return reply
    .type("image/svg+xml")
    .send(await readFile(path.join(publicDirectory, "assets", servedAsset)));
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
              ? "Dein StreamNet Cloud Konto ist bereit. Deine Daten bleiben auf deinen Geraeten synchron."
              : "Your StreamNet Cloud account is ready. Your data will stay in sync across your devices.");
          document.body.innerHTML = '<style>@keyframes success-pop{0%{transform:scale(.6);opacity:0}70%{transform:scale(1.08)}100%{transform:scale(1);opacity:1}}@keyframes success-draw{0%{width:0;height:0}45%{width:10px;height:0}100%{width:10px;height:22px}}.success-mark{width:64px;height:64px;margin:0 auto 22px;border:2px solid #6ee7a3;border-radius:50%;display:grid;place-items:center;color:#6ee7a3;animation:success-pop .55s ease-out both}.success-mark span{display:block;width:10px;height:22px;border-right:4px solid #6ee7a3;border-bottom:4px solid #6ee7a3;transform:rotate(45deg) translate(-2px,-2px);transform-origin:center;animation:success-draw .55s .25s ease-out both}</style><main style="min-height:calc(100vh - 56px);display:grid;place-items:center"><section style="width:min(560px,100%);padding:42px 34px;text-align:center;background:rgba(28,23,19,.94);border:1px solid rgba(229,162,9,.28);border-radius:18px;box-shadow:0 24px 70px rgba(0,0,0,.38)"><img src="/assets/streamnet-logo.svg" alt="StreamNet TV" style="width:min(260px,80%);height:auto;margin-bottom:34px"><div class="success-mark" aria-label="Success"><span></span></div><h1 style="margin:0;color:#f4efe7;font-size:clamp(28px,5vw,42px);line-height:1.1">' + title + '</h1><p style="margin:18px auto 0;max-width:420px;color:#d6cabb;font-size:16px;line-height:1.6">' + message + '</p><div style="margin-top:30px;color:#e5a209;font-size:12px;letter-spacing:.16em;text-transform:uppercase">StreamNet Cloud</div></section></main>';
        };
        new MutationObserver(() => {
          if (!statusNode || !statusNode.classList.contains("ok")) return;
          const text = statusNode.textContent.toLowerCase();
          const pairing = Boolean(new URLSearchParams(window.location.search).get("code"));
          const success = pairing || text.includes("angemeldet") || text.includes("signed in") || text.includes("konto erstellt") || text.includes("account created");
          if (success && document.body.contains(statusNode)) showSuccessPage(pairing);
        }).observe(statusNode, { childList: true, characterData: true, attributes: true, subtree: true });
      </script></body>`,
    );
  return reply.type("text/html; charset=utf-8").send(selfHostedPage);
});

app.get("/delete-account", async (_request, reply) => {
  const page = await readFile(
    path.join(publicDirectory, "delete-account.html"),
    "utf8",
  );
  return reply
    .type("text/html; charset=utf-8")
    .send(
      page.replaceAll(
        'const FUNCTIONS = "/.netlify/functions";',
        'const FUNCTIONS = "";',
      ),
    );
});

app.get("/privacy", async (_request, reply) =>
  reply
    .type("text/html; charset=utf-8")
    .send(await readFile(path.join(publicDirectory, "privacy.html"), "utf8")),
);

app.get("/discord/", async (_request, reply) =>
  reply
    .type("text/html; charset=utf-8")
    .send(
      await readFile(
        path.join(publicDirectory, "discord", "index.html"),
        "utf8",
      ),
    ),
);

app.get("/discord/callback", async (_request, reply) => {
  const page = await readFile(
    path.join(publicDirectory, "discord", "callback.html"),
    "utf8",
  );
  return reply.type("text/html; charset=utf-8").send(page);
});

app.get("/discord/callback.js", async (_request, reply) => {
  const script = await readFile(
    path.join(publicDirectory, "discord", "callback.js"),
    "utf8",
  );
  return reply
    .type("application/javascript; charset=utf-8")
    .send(
      script.replaceAll(
        "/.netlify/functions/discord-auth-callback",
        "/discord-auth-callback",
      ),
    );
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
    !account.password_hash.startsWith("scrypt:") ||
    !(await verifyScryptPassword(password, account.password_hash))
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
       values ($1, $2, $3, 'scrypt_v1')
       returning id, email, email_normalized`,
      [email, email, await hashScryptPassword(password)],
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

app.post("/account-delete-start", async (request, reply) => {
  const account = await authenticatedAccount(request);
  if (request.body?.confirmation !== "DELETE")
    return reply.code(400).send({ error: "Type DELETE to confirm" });

  const receiptToken = newRefreshToken();
  const jobId = newRefreshToken();
  const client = await pool.connect();
  try {
    await client.query("begin");
    await deleteAccountData(client, account);
    await client.query("commit");
    deletionReceipts.set(`${jobId}:${hashToken(receiptToken)}`, {
      status: "complete",
      expiresAt: Date.now() + 10 * 60_000,
    });
    return reply.send({ job_id: jobId, receipt_token: receiptToken });
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
});

app.post("/account-delete-status", async (request, reply) => {
  const jobId = String(request.body?.job_id || "");
  const receiptToken = String(request.body?.receipt_token || "");
  const key = `${jobId}:${hashToken(receiptToken)}`;
  const receipt = deletionReceipts.get(key);
  if (!receipt || Date.now() > receipt.expiresAt) {
    deletionReceipts.delete(key);
    return reply.code(404).send({ error: "Deletion receipt not found" });
  }
  deletionReceipts.delete(key);
  return reply.send({ status: receipt.status });
});

app.post("/discord-auth-start", async (request, reply) => {
  const clientId = String(request.body?.client_id || "").trim();
  const challenge = String(request.body?.code_challenge || "").trim();
  if (
    !/^\d{17,20}$/.test(clientId) ||
    !/^[A-Za-z0-9_-]{43,128}$/.test(challenge)
  )
    return reply
      .code(400)
      .send({ error: "Invalid Discord authorization request" });
  const deviceCode = randomCode(48);
  await pool.query(
    `insert into discord_auth_sessions (device_code, client_id, code_challenge, expires_at)
     values ($1, $2, $3, now() + interval '10 minutes')`,
    [deviceCode, clientId, challenge],
  );
  const query = new URLSearchParams({
    session: deviceCode,
    challenge,
    client_id: clientId,
  });
  const verificationUrl = `${config.publicBaseUrl}/discord/?${query}`;
  return reply.send({
    device_code: deviceCode,
    verification_uri_complete: verificationUrl,
    expires_in: 600,
    interval: 3,
  });
});

app.post("/discord-auth-status", async (request, reply) => {
  const deviceCode = String(request.body?.device_code || "").trim();
  if (!/^[A-Za-z0-9_-]{48}$/.test(deviceCode))
    return reply.code(400).send({ error: "Invalid device_code" });
  const result = await pool.query(
    "select status, authorization_code, expires_at from discord_auth_sessions where device_code = $1",
    [deviceCode],
  );
  const session = result.rows[0];
  if (!session || Date.now() > Date.parse(session.expires_at)) {
    await pool.query(
      "delete from discord_auth_sessions where device_code = $1",
      [deviceCode],
    );
    return reply.send({ status: "expired" });
  }
  if (session.status === "approved" && session.authorization_code) {
    await pool.query(
      "delete from discord_auth_sessions where device_code = $1",
      [deviceCode],
    );
    return reply.send({ status: "approved", code: session.authorization_code });
  }
  return reply.send({ status: "pending" });
});

app.post("/discord-auth-callback", async (request, reply) => {
  const deviceCode = String(request.body?.device_code || "").trim();
  const code = String(request.body?.code || "").trim();
  if (!/^\w{48}$/.test(deviceCode) || !code || code.length > 2048)
    return reply.code(400).send({ error: "Invalid Discord pairing request" });
  const result = await pool.query(
    "update discord_auth_sessions set status = 'approved', authorization_code = $2, approved_at = now() where device_code = $1 and status = 'pending' and expires_at > now() returning device_code",
    [deviceCode, code],
  );
  if (!result.rows[0])
    return reply
      .code(400)
      .send({ error: "Invalid or expired pairing session" });
  return reply.send({ ok: true });
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
  const consumed = await pool.query(
    `with approved as materialized (
       select device_code, access_token, refresh_token, user_email
         from tv_device_auth_sessions
        where device_code = $1 and status = 'approved' and access_token is not null and refresh_token is not null and expires_at > now()
          for update
     ), consumed as (
       update tv_device_auth_sessions as sessions
          set status = 'consumed', consumed_at = now(), access_token = null, refresh_token = null
         from approved
        where sessions.device_code = approved.device_code
        returning approved.access_token, approved.refresh_token, approved.user_email
     )
     select access_token, refresh_token, user_email from consumed`,
    [deviceCode],
  );
  const approvedSession = consumed.rows[0];
  if (approvedSession) {
    return reply.send({
      status: "approved",
      access_token: approvedSession.access_token,
      refresh_token: approvedSession.refresh_token,
      email: approvedSession.user_email,
    });
  }
  const result = await pool.query(
    "select status, expires_at from tv_device_auth_sessions where device_code = $1",
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
         values ($1, $2, $3, 'scrypt_v1') returning id, email, email_normalized`,
        [email, email, await hashScryptPassword(password)],
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
      !account.password_hash.startsWith("scrypt:") ||
      !(await verifyScryptPassword(password, account.password_hash))
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
