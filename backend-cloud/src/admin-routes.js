import crypto from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { presenceTimeoutSeconds } from "./presence.js";
import { SignJWT, jwtVerify } from "jose";
import { normalizeAdminUsername } from "./admin-username.js";
import { verifyScryptPassword } from "./passwords.js";
import { payloadMetrics, payloadUpdatedAtMillis } from "./snapshots.js";
import { deleteAccountData } from "./account-deletion.js";
import {
  applyAdminSnapshotMutation,
  adminGlobalInventory,
  applyAdminGlobalMutation,
  prepareAdminGlobalMutation,
  resolveAdminCatalogTemplate,
  hydrateAdminStremioAddon,
  summarizeAdminPayload,
} from "./admin-snapshots.js";

const backendPackage = JSON.parse(
  await readFile(new URL("../package.json", import.meta.url), "utf8"),
);

const adminLoginAttempts = new Map();
const adminLoginWindowMs = 15 * 60_000;
const adminLoginMaxAttempts = 8;
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const mutationFailureReasons = new Map([
  ["Snapshot payload is invalid", "invalid_snapshot_payload"],
  ["Mutation request is invalid", "invalid_mutation_request"],
  ["profileId is invalid", "invalid_profile_id"],
  ["Unknown profile", "unknown_profile"],
  ["Addon data must be an object", "invalid_addon_data"],
  ["Addon data is too large", "addon_data_too_large"],
  ["Addon id is invalid", "invalid_addon_id"],
  ["Addon name is invalid", "invalid_addon_name"],
  ["Addon manifest URL is required", "addon_manifest_url_required"],
  ["Addon manifest fetch failed", "addon_manifest_fetch_failed"],
  ["Addon manifest is invalid", "invalid_addon_manifest"],
  ["Addon manifest is too large", "addon_manifest_too_large"],
  ["Addon manifest id is invalid", "invalid_addon_manifest_id"],
  ["Addon manifest name is invalid", "invalid_addon_manifest_name"],
  ["Addon manifest version is invalid", "invalid_addon_manifest_version"],
  ["Playlist data must be an object", "invalid_playlist_data"],
  ["Playlist data is too large", "playlist_data_too_large"],
  ["Playlist id is invalid", "invalid_playlist_id"],
  ["Playlist name is invalid", "invalid_playlist_name"],
  ["Playlist m3uUrl is required", "playlist_url_required"],
  ["Catalog id is invalid", "invalid_catalog_id"],
  ["Catalog title is invalid", "invalid_catalog_title"],
  ["Catalog enabled must be a boolean", "invalid_catalog_enabled"],
  ["Catalog data must be an object", "invalid_catalog_data"],
  ["Catalog source type is invalid", "invalid_catalog_source_type"],
  ["Catalog list URL is invalid", "invalid_catalog_list_url"],
  ["Catalog template is unavailable", "catalog_template_unavailable"],
  ["Xtream server URL is invalid", "invalid_xtream_host"],
  ["Xtream username and password are required", "invalid_xtream_credentials"],
  ["Selected playlist has no valid Xtream credentials", "missing_xtream_credentials"],
  ["Playlist source type is invalid", "invalid_playlist_source_type"],
  ["Select StreamNet TV to edit its configuration", "invalid_streamnet_tv_target"],
  ["StreamNet TV is not configured for this account", "streamnet_tv_not_configured"],
  ["StreamNet TV host is already set", "streamnet_tv_host_unchanged"],
  ["StreamNet TV has no host override", "streamnet_tv_no_override"],
  ["rootKey is invalid", "invalid_profile_root"],
  ["field is invalid", "invalid_profile_field"],
  [
    "Profile field is not editable through this operation",
    "profile_field_not_editable",
  ],
  ["Field data is too large", "field_data_too_large"],
  ["Unsafe property name", "unsafe_property_name"],
  ["Payload data must be valid JSON", "invalid_payload_data"],
  ["Payload data is too large", "payload_data_too_large"],
  ["Payload must include at least one profile", "invalid_payload_profiles"],
  ["Cannot delete the only profile", "cannot_delete_last_profile"],
  ["Unsupported operation", "unsupported_operation"],
]);

function mutationFailureReason(error) {
  return mutationFailureReasons.get(error?.message) || "invalid_mutation_data";
}

function loginAttemptKey(request) {
  return request.ip || "unknown";
}

function isLoginBlocked(key, now = Date.now()) {
  const entry = adminLoginAttempts.get(key);
  if (!entry || now - entry.startedAt >= adminLoginWindowMs) {
    adminLoginAttempts.delete(key);
    return false;
  }
  return entry.count >= adminLoginMaxAttempts;
}

function recordLoginFailure(key, now = Date.now()) {
  const entry = adminLoginAttempts.get(key);
  if (!entry || now - entry.startedAt >= adminLoginWindowMs) {
    adminLoginAttempts.set(key, { count: 1, startedAt: now });
  } else {
    entry.count += 1;
  }
}

async function issueAdminToken(admin, jwtKey) {
  return new SignJWT({ email: admin.email_normalized, purpose: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(admin.id)
    .setIssuedAt()
    .setExpirationTime("30m")
    .sign(jwtKey);
}

async function authenticatedAdmin(request, pool, jwtKey) {
  const value = request.headers.authorization;
  if (!value?.startsWith("Bearer ")) {
    const error = new Error("Missing admin token");
    error.statusCode = 401;
    throw error;
  }
  try {
    const { payload } = await jwtVerify(value.slice(7), jwtKey);
    if (payload.purpose !== "admin" || !payload.sub) {
      throw new Error("Invalid token purpose");
    }
    const result = await pool.query(
      `select id, email, email_normalized
         from admin_accounts
        where id = $1 and disabled_at is null`,
      [payload.sub],
    );
    if (!result.rows[0]) throw new Error("Unknown admin");
    return result.rows[0];
  } catch {
    const error = new Error("Invalid or expired admin token");
    error.statusCode = 401;
    throw error;
  }
}

function parseLimit(value, fallback, maximum) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0
    ? Math.min(parsed, maximum)
    : fallback;
}

function parseOffset(value) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : 0;
}

function validAccountId(request, reply) {
  const accountId = String(request.params.accountId || "");
  if (!uuidPattern.test(accountId)) {
    reply.code(400).send({ error: "Invalid account id" });
    return null;
  }
  return accountId;
}

function cleanInstallId(value) {
  const installId = String(value || "").trim();
  if (!installId || installId.length > 200) return null;
  return installId;
}

function auditDetails(request) {
  const data =
    request.data && typeof request.data === "object" ? request.data : {};
  return {
    reason: String(request.reason || "").trim() || null,
    itemId: String(data.id || "").trim() || null,
    itemName: String(data.name || "").trim() || null,
    host: request.operation === "change_streamnet_host"
      ? String(data.host || "").trim().slice(0, 300) || null
      : null,
    rootKey: request.rootKey || null,
    field: request.field || null,
  };
}

function optionalAuditReason(value) {
  return (
    String(value || "")
      .trim()
      .slice(0, 500) || "Ohne Kommentar"
  );
}

function requireReason(request, reply) {
  const reason = String(request.body?.reason || "").trim();
  if (reason.length < 3 || reason.length > 500) {
    request.backendFailureReason = "invalid_change_reason";
    reply.code(400).send({ error: "A change reason is required" });
    return null;
  }
  return reason;
}

function setAdminSecurityHeaders(reply) {
  reply
    .header("Cache-Control", "no-store")
    .header("X-Content-Type-Options", "nosniff")
    .header("X-Frame-Options", "DENY")
    .header("Referrer-Policy", "no-referrer")
    .header(
      "Content-Security-Policy",
      "default-src 'self'; img-src 'self'; style-src 'self'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
    );
}

function globalState(rows) {
  return crypto.createHash("sha256").update(JSON.stringify(
    rows.map((row) => [row.account_id, row.revision, row.updated_at]),
  )).digest("hex");
}

function globalSummary(rows) {
  const addons = new Map();
  const playlists = new Map();
  const catalogs = new Map();
  let configurable = 0;
  for (const row of rows) {
    if (!row.payload) continue;
    const inventory = adminGlobalInventory(row.payload);
    if (!inventory.profileCount) continue;
    configurable += 1;
    for (const [map, items] of [[addons, inventory.addons], [playlists, inventory.playlists], [catalogs, inventory.catalogs]]) {
      for (const item of items) {
        const entry = map.get(item.id) || { ...item, accountCount: 0 };
        entry.accountCount += 1;
        map.set(item.id, entry);
      }
    }
  }
  return {
    total: rows.length,
    configurable,
    skipped: rows.length - configurable,
    state: globalState(rows),
    addons: [...addons.values()].sort((a, b) => a.name.localeCompare(b.name)),
    playlists: [...playlists.values()].sort((a, b) => a.name.localeCompare(b.name)),
    catalogs: [...catalogs.values()].sort((a, b) => a.name.localeCompare(b.name)),
  };
}

export function registerAdminRoutes(app, { pool, jwtKey, publicDirectory }) {
  const globalAccountsQuery = `select a.id as account_id, s.payload, s.revision, s.updated_at
    from accounts a left join account_sync_snapshots s on s.account_id = a.id
    order by a.id`;

  app.get("/admin-api/global", async (request, reply) => {
    reply.header("Cache-Control", "no-store");
    await authenticatedAdmin(request, pool, jwtKey);
    return globalSummary((await pool.query(globalAccountsQuery)).rows);
  });

  async function globalMutation(request, reply, preview) {
    reply.header("Cache-Control", "no-store");
    const admin = await authenticatedAdmin(request, pool, jwtKey);
    if (!preview && (request.body?.confirmation !== "ALLE ACCOUNTS" ||
        typeof request.body?.expectedState !== "string")) {
      request.backendFailureReason = "invalid_global_confirmation";
      return reply.code(400).send({ error: "Globale Bestätigung und Vorschau sind erforderlich." });
    }
    let mutation;
    try {
      const body = { ...request.body };
      if (body.operation === "add_addon" || body.operation === "edit_addon") {
        body.data = await hydrateAdminStremioAddon(body.data);
      }
      mutation = prepareAdminGlobalMutation(body);
    } catch (error) {
      request.backendFailureReason = mutationFailureReason(error);
      return reply.code(400).send({ error: error.message });
    }
    const client = await pool.connect();
    try {
      await client.query("begin");
      // Serialize with account deletion first, then with snapshot pushes.
      if (!preview) {
        await client.query("select id from accounts order by id for update");
        await client.query("select account_id from account_sync_snapshots order by account_id for update");
      }
      const rows = (await client.query(globalAccountsQuery)).rows;
      const summary = globalSummary(rows);
      if (!preview && summary.state !== request.body.expectedState) {
        await client.query("rollback");
        request.backendFailureReason = "global_revision_conflict";
        return reply.code(409).send({ error: "Accounts wurden zwischenzeitlich geändert. Bitte erneut eine Vorschau laden." });
      }
      if (mutation.operation === "add_catalog" && mutation.data.templateId) {
        const input = mutation.data;
        const template = rows.filter((row) => row.payload)
          .map((row) => resolveAdminCatalogTemplate(row.payload, input.templateId))
          .find((catalog) => catalog &&
            (input.sourceType === "PREINSTALLED" ? catalog.isPreinstalled ||
              String(catalog.sourceType).toUpperCase() === "PREINSTALLED" :
              String(catalog.sourceType).toUpperCase() === input.sourceType));
        if (!template) {
          await client.query("rollback");
          request.backendFailureReason = "catalog_template_unavailable";
          return reply.code(400).send({ error: "Catalog template is unavailable" });
        }
        mutation.data = {
          ...template, enabled: input.enabled, remoteManaged: true,
          ...(input.title ? { title: input.title, name: input.title, remoteTitle: input.title } : {}),
        };
      }
      let changed = 0;
      const now = Date.now();
      const batchId = crypto.randomUUID();
      for (const row of rows) {
        if (!row.payload || !adminGlobalInventory(row.payload).profileCount) continue;
        let nextPayload;
        try {
          nextPayload = applyAdminGlobalMutation(row.payload, mutation, now);
        } catch (error) {
          await client.query("rollback");
          request.backendFailureReason = mutationFailureReason(error);
          return reply.code(400).send({ error: `Account ${row.account_id}: ${error.message}` });
        }
        if (!nextPayload) continue;
        changed += 1;
        if (preview) continue;
        const revision = Number(row.revision);
        await client.query(
          `update account_sync_snapshots set payload = $2::jsonb, revision = $3,
            payload_updated_at = to_timestamp($4::double precision / 1000.0),
            source = 'admin', updated_at = now() where account_id = $1`,
          [row.account_id, JSON.stringify(nextPayload), revision + 1, payloadUpdatedAtMillis(nextPayload)],
        );
        await client.query(
          `insert into admin_audit_logs (
            id, admin_id, account_id, operation, reason, details,
            revision_before, revision_after, request_ip, user_agent
          ) values ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9, $10)`,
          [crypto.randomUUID(), admin.id, row.account_id, `global_${mutation.operation}`,
            optionalAuditReason(request.body.reason),
            JSON.stringify({ batchId, targetId: mutation.targetId, itemId: mutation.data?.id || null }),
            revision, revision + 1, request.ip || null,
            String(request.headers["user-agent"] || "").slice(0, 500) || null],
        );
      }
      await client.query("commit");
      return {
        preview, accepted: !preview, state: summary.state,
        total: summary.total, configurable: summary.configurable,
        changed, unchanged: summary.configurable - changed, skipped: summary.skipped,
      };
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
  }

  app.post("/admin-api/global/preview", (request, reply) => globalMutation(request, reply, true));
  app.patch("/admin-api/global/snapshot", (request, reply) => globalMutation(request, reply, false));

  app.get("/admin", async (_request, reply) => {
    setAdminSecurityHeaders(reply);
    return reply
      .type("text/html; charset=utf-8")
      .send(await readFile(path.join(publicDirectory, "admin.html"), "utf8"));
  });

  app.get("/admin/admin.css", async (_request, reply) => {
    setAdminSecurityHeaders(reply);
    return reply
      .type("text/css; charset=utf-8")
      .send(await readFile(path.join(publicDirectory, "admin.css"), "utf8"));
  });

  app.get("/admin/admin.js", async (_request, reply) => {
    setAdminSecurityHeaders(reply);
    return reply
      .type("application/javascript; charset=utf-8")
      .send(await readFile(path.join(publicDirectory, "admin.js"), "utf8"));
  });

  app.post("/admin-api/login", async (request, reply) => {
    reply.header("Cache-Control", "no-store");
    const username = normalizeAdminUsername(request.body?.username);
    const password = String(request.body?.password || "");
    const attemptKey = loginAttemptKey(request);
    if (isLoginBlocked(attemptKey)) {
      return reply.code(429).send({ error: "Too many sign-in attempts" });
    }
    if (!username || !password) {
      recordLoginFailure(attemptKey);
      return reply.code(401).send({ error: "Invalid admin credentials" });
    }
    const result = await pool.query(
      `select id, email, email_normalized, password_hash
         from admin_accounts
        where email_normalized = $1 and disabled_at is null`,
      [username],
    );
    const admin = result.rows[0];
    if (
      !admin ||
      !(await verifyScryptPassword(password, admin.password_hash))
    ) {
      recordLoginFailure(attemptKey);
      return reply.code(401).send({ error: "Invalid admin credentials" });
    }
    adminLoginAttempts.delete(attemptKey);
    await pool.query(
      "update admin_accounts set last_login_at = now() where id = $1",
      [admin.id],
    );
    return {
      access_token: await issueAdminToken(admin, jwtKey),
      token_type: "bearer",
      expires_in: 1800,
      admin: { id: admin.id, username: admin.email },
    };
  });

  app.get("/admin-api/overview", async (request, reply) => {
    reply.header("Cache-Control", "no-store");
    await authenticatedAdmin(request, pool, jwtKey);
    const queryStarted = performance.now();
    const result = await pool.query(
      `select
         (select count(*)::int from accounts) as accounts,
         (select count(*)::int from account_sync_snapshots) as snapshots,
         (select count(*)::int from account_sessions where revoked_at is null and expires_at > now()) as active_sessions,
         (select count(*)::int from device_presence
           where last_seen >= now() - interval '${presenceTimeoutSeconds} seconds') as online_devices,
         (select count(*)::int from app_usage_events where created_at >= now() - interval '24 hours') as events_24h,
         (select count(*)::int from watch_history) as watch_history_items,
         (select count(*)::int from watch_state) as watch_state_items,
         (select coalesce(sum(case when jsonb_typeof(payload->'profiles') = 'array'
            then jsonb_array_length(payload->'profiles') else 0 end), 0)::int
            from account_sync_snapshots) as profiles,
         (select count(*)::int from accounts where created_at >= now() - interval '24 hours') as new_accounts_24h,
         (select count(*)::int from accounts where created_at >= now() - interval '7 days') as new_accounts_7d,
         (select count(*)::int from account_sync_snapshots where updated_at >= now() - interval '24 hours') as syncs_24h,
         pg_database_size(current_database())::bigint as database_bytes`,
    );
    const databaseQueryMs = performance.now() - queryStarted;
    const [recentAccounts, recentAudits, migrations] = await Promise.all([
      pool.query("select id, email, created_at from accounts order by created_at desc, id desc limit 5"),
      pool.query(`select audit.id, audit.operation, audit.reason, audit.created_at,
                        accounts.email as account_email
                   from admin_audit_logs audit
                   left join accounts on accounts.id = audit.account_id
                  order by audit.created_at desc, audit.id desc limit 5`),
      pool.query("select version from schema_migrations order by version desc limit 1"),
    ]);
    const row = result.rows[0];
    const memory = process.memoryUsage();
    const cpu = process.cpuUsage();
    const uptime = process.uptime();
    return {
      ...Object.fromEntries(
        Object.entries(row).map(([key, value]) => [key, Number(value)]),
      ),
      system: {
        checked_at: new Date().toISOString(),
        uptime_seconds: Math.floor(uptime),
        database_connected: true,
        database_query_ms: Math.round(databaseQueryMs),
        memory_rss_bytes: memory.rss,
        heap_used_bytes: memory.heapUsed,
        heap_total_bytes: memory.heapTotal,
        host_memory_total_bytes: os.totalmem(),
        host_memory_free_bytes: os.freemem(),
        cpu_average_percent: Math.round((cpu.user + cpu.system) / (uptime * 1e6) * 1000) / 10,
        node_version: process.version,
        platform: `${process.platform} / ${process.arch}`,
        schema_version: migrations.rows[0]?.version ?? null,
      },
      versions: { backend: backendPackage.version },
      recent_accounts: recentAccounts.rows,
      recent_audits: recentAudits.rows,
    };
  });

  async function liveVersions(request, reply) {
    reply.header("Cache-Control", "no-store");
    await authenticatedAdmin(request, pool, jwtKey);
    const sources = [
      ["web", "https://web.streamnet.live/api/version"],
      ["android", "https://api.github.com/repos/cyb3rgh05t/streamnet-debrid/releases/latest"],
    ];
    const results = await Promise.allSettled(sources.map(async ([component, url]) => {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(8000),
        redirect: "error",
        headers: { accept: "application/json" },
        cache: "no-store",
      });
      if (!response.ok) throw new Error(`${component === "web" ? "Webplayer" : "GitHub"} HTTP ${response.status}`);
      const data = await response.json();
      const version = component === "android"
        ? data.tag_name
        : data.version;
      if (typeof version !== "string" || !/^\d+\.\d+\.\d+$/.test(version)) {
        throw new Error("Ungültige Versionsantwort");
      }
      if (component === "android" && (data.draft || data.prerelease ||
          !Array.isArray(data.assets) ||
          !data.assets.some(asset => asset.name === `StreamNet-Debrid-${version}.apk`) ||
          !Number.isFinite(Date.parse(data.published_at)))) {
        throw new Error("Kein veröffentlichtes APK-Release gefunden");
      }
      return component === "web"
        ? { component, version, build: data.build == null ? null : String(data.build), source: "web.streamnet.live · Live-Abfrage" }
        : { component, version, published_at: data.published_at, source: "GitHub · Veröffentlichtes APK-Release" };
    }));
    return {
      checked_at: new Date().toISOString(),
      source: "Live-Webplayer und veröffentlichtes APK-Release",
      components: [{ component: "backend", version: backendPackage.version, source: "Laufender Backend-Prozess" }, ...results.map((result, index) => {
        if (result.status === "fulfilled") return result.value;
        request.log.warn({ err: result.reason, component: sources[index][0] }, "Admin update check failed");
        return { component: sources[index][0], error: result.reason.message };
      })],
    };
  }
  app.get("/admin-api/versions", liveVersions);
  app.get("/admin-api/updates", liveVersions);

  app.get("/admin-api/accounts", async (request, reply) => {
    reply.header("Cache-Control", "no-store");
    await authenticatedAdmin(request, pool, jwtKey);
    const query = String(request.query?.q || "")
      .trim()
      .toLowerCase()
      .slice(0, 254);
    const onlineOnly = String(request.query?.online_only || "") === "1";
    const limit = parseLimit(request.query?.limit, 50, 100);
    const offset = parseOffset(request.query?.offset);
    const [accounts, count] = await Promise.all([
      pool.query(
        `select accounts.id, accounts.email, accounts.created_at, accounts.updated_at,
                snapshots.revision, snapshots.updated_at as snapshot_updated_at,
                case when jsonb_typeof(snapshots.payload->'profiles') = 'array'
                  then jsonb_array_length(snapshots.payload->'profiles') else 0 end as profile_count,
                online_devices.online_device_count
           from accounts
           left join account_sync_snapshots snapshots on snapshots.account_id = accounts.id
           left join lateral (
             select count(*)::int as online_device_count
               from device_presence
              where account_id = accounts.id
                and last_seen >= now() - interval '${presenceTimeoutSeconds} seconds'
           ) online_devices on true
          where ($1 = '' or accounts.email_normalized like '%' || $1 || '%')
            and ($4::boolean is false or online_devices.online_device_count > 0)
          order by accounts.created_at desc
          limit $2 offset $3`,
        [query, limit, offset, onlineOnly],
      ),
      pool.query(
        `select count(*)::int as total from accounts
          where ($1 = '' or email_normalized like '%' || $1 || '%')
            and ($2::boolean is false or exists (
              select 1 from device_presence
               where account_id = accounts.id
                 and last_seen >= now() - interval '${presenceTimeoutSeconds} seconds'
            ))`,
        [query, onlineOnly],
      ),
    ]);
    return {
      accounts: accounts.rows.map((row) => ({
        ...row,
        revision: row.revision === null ? null : Number(row.revision),
        profile_count: Number(row.profile_count),
        online_device_count: Number(row.online_device_count),
      })),
      total: Number(count.rows[0].total),
      limit,
      offset,
    };
  });

  app.get("/admin-api/accounts/:accountId", async (request, reply) => {
    reply.header("Cache-Control", "no-store");
    await authenticatedAdmin(request, pool, jwtKey);
    const accountId = validAccountId(request, reply);
    if (!accountId) return;
    const [result, devicesResult, sessionsResult] = await Promise.all([
      pool.query(
        `select accounts.id, accounts.email, accounts.created_at, accounts.updated_at,
                snapshots.payload, snapshots.revision, snapshots.source,
                snapshots.payload_updated_at, snapshots.updated_at as snapshot_updated_at,
                (select count(*)::int from account_sessions where account_id = accounts.id and revoked_at is null and expires_at > now()) as active_sessions,
                (select count(*)::int from watch_history where account_id = accounts.id) as watch_history_items,
                (select count(*)::int from watch_state where account_id = accounts.id) as watch_state_items
           from accounts
           left join account_sync_snapshots snapshots on snapshots.account_id = accounts.id
          where accounts.id = $1`,
        [accountId],
      ),
      pool.query(
        `select install_id, profile_id, platform, device_type, app_version,
                app_version_code, distribution, event_name, last_seen,
                presence_supported,
                presence_supported and last_seen >= now() - interval '${presenceTimeoutSeconds} seconds' as online
           from (
             select install_id, profile_id, platform, device_type, app_version,
                    app_version_code, distribution, 'heartbeat' as event_name,
                    last_seen, true as presence_supported
               from device_presence where account_id = $1
             union all
             select legacy.*, false as presence_supported from (
             select distinct on (install_id)
                    install_id, profile_id, platform, device_type, app_version,
                    app_version_code, distribution, event_name, created_at as last_seen
               from app_usage_events
              where account_id = $1 and coalesce(install_id, '') <> ''
                and not exists (select 1 from device_presence presence
                                 where presence.account_id = $1
                                   and presence.install_id = app_usage_events.install_id)
              order by install_id, created_at desc, id desc
             ) legacy
           ) latest_events
          order by online desc, last_seen desc
          limit 50`,
        [accountId],
      ),
      pool.query(
        `select id, created_at, expires_at, client_type, device_type, user_agent
           from account_sessions
          where account_id = $1 and revoked_at is null and expires_at > now()
          order by created_at desc
          limit 20`,
        [accountId],
      ),
    ]);
    const account = result.rows[0];
    if (!account) return reply.code(404).send({ error: "Account not found" });
    const summary = summarizeAdminPayload(account.payload);
    return {
      account: {
        id: account.id,
        email: account.email,
        created_at: account.created_at,
        updated_at: account.updated_at,
        active_sessions: Number(account.active_sessions),
        watch_history_items: Number(account.watch_history_items),
        watch_state_items: Number(account.watch_state_items),
        devices: [
          ...devicesResult.rows.map((row) => ({
            kind: "app_event",
            removable: true,
            install_id: row.install_id,
            profile_id: row.profile_id,
            platform: row.platform,
            device_type: row.device_type,
            app_version: row.app_version,
            app_version_code: row.app_version_code,
            distribution: row.distribution,
            event_name: row.event_name,
            last_seen: row.last_seen,
            online: row.online === true,
            status_label: row.presence_supported ? (row.online ? "Online" : "Offline") : "Kein Live-Status",
          })),
          ...sessionsResult.rows.map((row) => ({
            kind: "session",
            removable: true,
            install_id: row.id,
            profile_id: null,
            platform: row.client_type || "login",
            device_type: row.device_type || row.client_type || "web",
            app_version: null,
            app_version_code: null,
            distribution: "web-login",
            event_name: "active_session",
            status_label: "Login gültig",
            last_seen: row.created_at,
            expires_at: row.expires_at,
            user_agent: row.user_agent,
            online: false,
          })),
        ],
      },
      snapshot: account.payload
        ? {
            revision: Number(account.revision),
            source: account.source,
            payload_updated_at: account.payload_updated_at,
            updated_at: account.snapshot_updated_at,
            ...payloadMetrics(account.payload),
            ...summary,
          }
        : null,
    };
  });

  app.patch(
    "/admin-api/accounts/:accountId/snapshot",
    async (request, reply) => {
      reply.header("Cache-Control", "no-store");
      const admin = await authenticatedAdmin(request, pool, jwtKey);
      const accountId = validAccountId(request, reply);
      if (!accountId) return;
      const expectedRevision = request.body?.expectedRevision;
      const reason = optionalAuditReason(request.body?.reason);
      if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0) {
        request.backendFailureReason = "invalid_expected_revision";
        return reply.code(400).send({ error: "expectedRevision is required" });
      }

      const client = await pool.connect();
      try {
        await client.query("begin");
        const currentResult = await client.query(
          `select payload, revision from account_sync_snapshots
          where account_id = $1 for update`,
          [accountId],
        );
        const current = currentResult.rows[0];
        if (!current) {
          await client.query("rollback");
          return reply.code(404).send({ error: "Account snapshot not found" });
        }
        const revision = Number(current.revision);
        if (revision !== expectedRevision) {
          await client.query("rollback");
          return reply.code(409).send({
            accepted: false,
            reason: "revision_conflict",
            revision,
          });
        }

        let nextPayload;
        const mutationBody = { ...request.body };
        if (mutationBody.operation === "upsert_addon") {
          try {
            mutationBody.data = await hydrateAdminStremioAddon(
              mutationBody.data,
            );
          } catch (error) {
            await client.query("rollback");
            request.backendFailureReason = mutationFailureReason(error);
            return reply.code(400).send({ error: error.message });
          }
        }

        try {
          nextPayload = applyAdminSnapshotMutation(
            current.payload,
            mutationBody,
          );
        } catch (error) {
          await client.query("rollback");
          request.backendFailureReason = mutationFailureReason(error);
          return reply.code(400).send({ error: error.message });
        }
        const nextRevision = revision + 1;
        await client.query(
          `update account_sync_snapshots
            set payload = $2::jsonb, revision = $3,
                payload_updated_at = to_timestamp($4::double precision / 1000.0),
                source = 'admin', updated_at = now()
          where account_id = $1`,
          [
            accountId,
            JSON.stringify(nextPayload),
            nextRevision,
            payloadUpdatedAtMillis(nextPayload),
          ],
        );
        const auditId = crypto.randomUUID();
        await client.query(
          `insert into admin_audit_logs (
           id, admin_id, account_id, operation, profile_id, reason,
           details, revision_before, revision_after, request_ip, user_agent
         ) values ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, $10, $11)`,
          [
            auditId,
            admin.id,
            accountId,
            mutationBody.operation,
            mutationBody.profileId,
            reason,
            JSON.stringify(auditDetails(mutationBody)),
            revision,
            nextRevision,
            request.ip || null,
            String(request.headers["user-agent"] || "").slice(0, 500) || null,
          ],
        );
        await client.query("commit");
        return {
          accepted: true,
          revision: nextRevision,
          audit_id: auditId,
          summary: summarizeAdminPayload(nextPayload),
        };
      } catch (error) {
        await client.query("rollback");
        throw error;
      } finally {
        client.release();
      }
    },
  );

  app.post(
    "/admin-api/accounts/:accountId/sessions/revoke-all",
    async (request, reply) => {
      reply.header("Cache-Control", "no-store");
      const admin = await authenticatedAdmin(request, pool, jwtKey);
      const accountId = validAccountId(request, reply);
      if (!accountId) return;
      const reason = optionalAuditReason(request.body?.reason);

      const client = await pool.connect();
      try {
        await client.query("begin");
        const accountResult = await client.query(
          "select id from accounts where id = $1 for update",
          [accountId],
        );
        if (!accountResult.rows[0]) {
          await client.query("rollback");
          return reply.code(404).send({ error: "Account not found" });
        }
        const revoked = await client.query(
          `update account_sessions set revoked_at = now()
            where account_id = $1 and revoked_at is null
          returning id`,
          [accountId],
        );
        const revisionResult = await client.query(
          "select revision from account_sync_snapshots where account_id = $1",
          [accountId],
        );
        const revision = Number(revisionResult.rows[0]?.revision || 0);
        const auditId = crypto.randomUUID();
        await client.query(
          `insert into admin_audit_logs (
           id, admin_id, account_id, operation, profile_id, reason,
           details, revision_before, revision_after, request_ip, user_agent
         ) values ($1, $2, $3, 'revoke_sessions', null, $4, $5::jsonb, $6, $6, $7, $8)`,
          [
            auditId,
            admin.id,
            accountId,
            reason,
            JSON.stringify({ revokedCount: revoked.rowCount }),
            revision,
            request.ip || null,
            String(request.headers["user-agent"] || "").slice(0, 500) || null,
          ],
        );
        await client.query("commit");
        return { accepted: true, revoked_count: revoked.rowCount };
      } catch (error) {
        await client.query("rollback");
        throw error;
      } finally {
        client.release();
      }
    },
  );

  async function revokeSingleAccountSession(request, reply) {
    reply.header("Cache-Control", "no-store");
    await authenticatedAdmin(request, pool, jwtKey);
    const accountId = validAccountId(request, reply);
    if (!accountId) return;
    const sessionId = String(request.params.sessionId || "").trim();
    if (!uuidPattern.test(sessionId)) {
      return reply.code(400).send({ error: "Invalid session id" });
    }
    const result = await pool.query(
      `update account_sessions
          set revoked_at = now()
        where account_id = $1 and id = $2 and revoked_at is null
        returning id`,
      [accountId, sessionId],
    );
    if (result.rowCount === 0) {
      return reply.code(404).send({ error: "Login session not found" });
    }
    return { accepted: true, revoked_count: result.rowCount };
  }

  app.post(
    "/admin-api/accounts/:accountId/sessions/:sessionId/revoke",
    revokeSingleAccountSession,
  );

  app.delete(
    "/admin-api/accounts/:accountId/sessions/:sessionId",
    revokeSingleAccountSession,
  );

  app.delete(
    "/admin-api/accounts/:accountId/devices/offline",
    async (request, reply) => {
      reply.header("Cache-Control", "no-store");
      await authenticatedAdmin(request, pool, jwtKey);
      const accountId = validAccountId(request, reply);
      if (!accountId) return;
      const result = await pool.query(
        `with offline_installs as (
           select install_id from device_presence
            where account_id = $1 and last_seen < now() - interval '${presenceTimeoutSeconds} seconds'
           union
           select distinct install_id from app_usage_events events
            where account_id = $1 and coalesce(install_id, '') <> ''
              and not exists (
                select 1 from device_presence presence
                 where presence.account_id = $1 and presence.install_id = events.install_id
                   and presence.last_seen >= now() - interval '${presenceTimeoutSeconds} seconds'
              )
         ), removed_presence as (
           delete from device_presence where account_id = $1
             and install_id in (select install_id from offline_installs)
           returning install_id
         ), removed_events as (
         delete from app_usage_events events
          using offline_installs
          where events.account_id = $1
            and events.install_id = offline_installs.install_id
          returning events.install_id
         )
         select (select count(*)::int from removed_events) as removed_events,
                (select count(*)::int from (
                  select install_id from removed_events union select install_id from removed_presence
                ) removed) as removed_devices`,
        [accountId],
      );
      return { accepted: true, ...result.rows[0] };
    },
  );

  app.post(
    "/admin-api/accounts/:accountId/devices/cleanup",
    async (request, reply) => {
      reply.header("Cache-Control", "no-store");
      await authenticatedAdmin(request, pool, jwtKey);
      const accountId = validAccountId(request, reply);
      if (!accountId) return;
      const [eventsResult, sessionsResult] = await Promise.all([
        pool.query(
          `with ranked_events as (
             select id,
                    row_number() over (
                      partition by install_id
                      order by created_at desc, id desc
                    ) as rank
               from app_usage_events
              where account_id = $1 and coalesce(install_id, '') <> ''
           )
           delete from app_usage_events events
            using ranked_events
            where events.id = ranked_events.id
              and ranked_events.rank > 1`,
          [accountId],
        ),
        pool.query(
          `with ranked_sessions as (
             select id,
                    row_number() over (
                      partition by coalesce(client_type, ''), coalesce(device_type, ''), coalesce(user_agent, ''), coalesce(request_ip, '')
                      order by created_at desc, id desc
                    ) as rank
               from account_sessions
              where account_id = $1 and revoked_at is null and expires_at > now()
           )
           update account_sessions sessions
              set revoked_at = now()
             from ranked_sessions
            where sessions.id = ranked_sessions.id
              and ranked_sessions.rank > 1`,
          [accountId],
        ),
      ]);
      return {
        accepted: true,
        removed_events: eventsResult.rowCount,
        revoked_sessions: sessionsResult.rowCount,
      };
    },
  );

  app.delete(
    "/admin-api/accounts/:accountId/devices/:installId",
    async (request, reply) => {
      reply.header("Cache-Control", "no-store");
      await authenticatedAdmin(request, pool, jwtKey);
      const accountId = validAccountId(request, reply);
      if (!accountId) return;
      const installId = cleanInstallId(request.params.installId);
      if (!installId)
        return reply.code(400).send({ error: "Invalid device id" });
      const result = await pool.query(
        `with removed_presence as (
           delete from device_presence where account_id = $1 and install_id = $2 returning install_id
         ), removed_events as (
         delete from app_usage_events
          where account_id = $1 and install_id = $2 returning install_id
         )
         select (select count(*)::int from removed_events) as removed_events,
                (select count(*)::int from (
                  select install_id from removed_events union select install_id from removed_presence
                ) removed) as removed_devices`,
        [accountId, installId],
      );
      return { accepted: true, ...result.rows[0] };
    },
  );

  app.delete("/admin-api/accounts/:accountId", async (request, reply) => {
    reply.header("Cache-Control", "no-store");
    const admin = await authenticatedAdmin(request, pool, jwtKey);
    const accountId = validAccountId(request, reply);
    if (!accountId) return;
    const reason = requireReason(request, reply);
    if (!reason) return;

    const client = await pool.connect();
    try {
      await client.query("begin");
      const accountResult = await client.query(
        "select id, email, email_normalized from accounts where id = $1 for update",
        [accountId],
      );
      const account = accountResult.rows[0];
      if (!account) {
        await client.query("rollback");
        return reply.code(404).send({ error: "Account not found" });
      }
      const revisionResult = await client.query(
        "select revision from account_sync_snapshots where account_id = $1",
        [accountId],
      );
      const revision = Number(revisionResult.rows[0]?.revision || 0);
      const auditId = crypto.randomUUID();
      await deleteAccountData(client, account);
      await client.query(
        `insert into admin_audit_logs (
           id, admin_id, account_id, operation, profile_id, reason,
           details, revision_before, revision_after, request_ip, user_agent
         ) values ($1, $2, $3, 'delete_account', null, $4, $5::jsonb, $6, $6, $7, $8)`,
        [
          auditId,
          admin.id,
          null,
          reason,
          JSON.stringify({ accountId, email: account.email }),
          revision,
          request.ip || null,
          String(request.headers["user-agent"] || "").slice(0, 500) || null,
        ],
      );
      await client.query("commit");
      return { accepted: true, audit_id: auditId };
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
  });

  app.get("/admin-api/audits", async (request, reply) => {
    reply.header("Cache-Control", "no-store");
    await authenticatedAdmin(request, pool, jwtKey);
    const limit = parseLimit(request.query?.limit, 50, 100);
    const offset = parseOffset(request.query?.offset);
    const accountId = String(request.query?.account_id || "").trim();
    const [result, count] = await Promise.all([
      pool.query(
        `select audit.id, audit.operation, audit.profile_id, audit.reason,
                audit.details, audit.revision_before, audit.revision_after,
                audit.created_at, audit.account_id, accounts.email as account_email,
                admins.email as admin_email,
                profile.name as profile_name
           from admin_audit_logs audit
           join admin_accounts admins on admins.id = audit.admin_id
           left join accounts on accounts.id = audit.account_id
           left join account_sync_snapshots snapshots on snapshots.account_id = audit.account_id
           left join lateral (
             select item->>'name' as name
               from jsonb_array_elements(
                 case when jsonb_typeof(snapshots.payload->'profiles') = 'array'
                      then snapshots.payload->'profiles' else '[]'::jsonb end
               ) item
              where item->>'id' = audit.profile_id
              limit 1
           ) profile on true
          where ($1 = '' or audit.account_id::text = $1)
          order by audit.created_at desc
          limit $2 offset $3`,
        [accountId, limit, offset],
      ),
      pool.query(
        `select count(*)::int as total
           from admin_audit_logs audit
          where ($1 = '' or audit.account_id::text = $1)`,
        [accountId],
      ),
    ]);
    return {
      audits: result.rows.map((row) => ({
        ...row,
        revision_before: Number(row.revision_before),
        revision_after: Number(row.revision_after),
      })),
      total: Number(count.rows[0].total),
      limit,
      offset,
    };
  });

  app.delete("/admin-api/audits", async (request, reply) => {
    reply.header("Cache-Control", "no-store");
    await authenticatedAdmin(request, pool, jwtKey);
    const result = await pool.query("delete from admin_audit_logs");
    return { accepted: true, deleted_count: result.rowCount };
  });
}
