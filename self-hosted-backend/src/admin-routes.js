import crypto from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { SignJWT, jwtVerify } from "jose";
import { normalizeAndValidateEmail } from "./email.js";
import { verifyScryptPassword } from "./passwords.js";
import { payloadMetrics, payloadUpdatedAtMillis } from "./snapshots.js";
import {
  applyAdminSnapshotMutation,
  summarizeAdminPayload,
} from "./admin-snapshots.js";

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
  ["Playlist data must be an object", "invalid_playlist_data"],
  ["Playlist data is too large", "playlist_data_too_large"],
  ["Playlist id is invalid", "invalid_playlist_id"],
  ["Playlist name is invalid", "invalid_playlist_name"],
  ["Playlist m3uUrl is required", "playlist_url_required"],
  ["rootKey is invalid", "invalid_profile_root"],
  ["field is invalid", "invalid_profile_field"],
  [
    "Profile field is not editable through this operation",
    "profile_field_not_editable",
  ],
  ["Field data is too large", "field_data_too_large"],
  ["Unsafe property name", "unsafe_property_name"],
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

function auditDetails(request) {
  const data =
    request.data && typeof request.data === "object" ? request.data : {};
  return {
    reason: String(request.reason || "").trim(),
    itemId: String(data.id || "").trim() || null,
    itemName: String(data.name || "").trim() || null,
    rootKey: request.rootKey || null,
    field: request.field || null,
  };
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

export function registerAdminRoutes(app, { pool, jwtKey, publicDirectory }) {
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
    const email = normalizeAndValidateEmail(request.body?.email);
    const password = String(request.body?.password || "");
    const attemptKey = loginAttemptKey(request);
    if (isLoginBlocked(attemptKey)) {
      return reply.code(429).send({ error: "Too many sign-in attempts" });
    }
    if (!email || !password) {
      recordLoginFailure(attemptKey);
      return reply.code(401).send({ error: "Invalid admin credentials" });
    }
    const result = await pool.query(
      `select id, email, email_normalized, password_hash
         from admin_accounts
        where email_normalized = $1 and disabled_at is null`,
      [email],
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
      admin: { id: admin.id, email: admin.email },
    };
  });

  app.get("/admin-api/overview", async (request, reply) => {
    reply.header("Cache-Control", "no-store");
    await authenticatedAdmin(request, pool, jwtKey);
    const result = await pool.query(
      `select
         (select count(*)::int from accounts) as accounts,
         (select count(*)::int from account_sync_snapshots) as snapshots,
         (select count(*)::int from account_sessions where revoked_at is null and expires_at > now()) as active_sessions,
         (select count(*)::int from app_usage_events where created_at >= now() - interval '24 hours') as events_24h,
         (select count(*)::int from watch_history) as watch_history_items,
         (select count(*)::int from watch_state) as watch_state_items,
         pg_database_size(current_database())::bigint as database_bytes`,
    );
    const row = result.rows[0];
    return Object.fromEntries(
      Object.entries(row).map(([key, value]) => [key, Number(value)]),
    );
  });

  app.get("/admin-api/accounts", async (request, reply) => {
    reply.header("Cache-Control", "no-store");
    await authenticatedAdmin(request, pool, jwtKey);
    const query = String(request.query?.q || "")
      .trim()
      .toLowerCase()
      .slice(0, 254);
    const limit = parseLimit(request.query?.limit, 50, 100);
    const offset = parseOffset(request.query?.offset);
    const [accounts, count] = await Promise.all([
      pool.query(
        `select accounts.id, accounts.email, accounts.created_at, accounts.updated_at,
                snapshots.revision, snapshots.updated_at as snapshot_updated_at,
                case when jsonb_typeof(snapshots.payload->'profiles') = 'array'
                  then jsonb_array_length(snapshots.payload->'profiles') else 0 end as profile_count
           from accounts
           left join account_sync_snapshots snapshots on snapshots.account_id = accounts.id
          where ($1 = '' or accounts.email_normalized like '%' || $1 || '%')
          order by accounts.created_at desc
          limit $2 offset $3`,
        [query, limit, offset],
      ),
      pool.query(
        `select count(*)::int as total from accounts
          where ($1 = '' or email_normalized like '%' || $1 || '%')`,
        [query],
      ),
    ]);
    return {
      accounts: accounts.rows.map((row) => ({
        ...row,
        revision: row.revision === null ? null : Number(row.revision),
        profile_count: Number(row.profile_count),
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
    const result = await pool.query(
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
    );
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
      const reason = String(request.body?.reason || "").trim();
      if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0) {
        request.backendFailureReason = "invalid_expected_revision";
        return reply.code(400).send({ error: "expectedRevision is required" });
      }
      if (reason.length < 3 || reason.length > 500) {
        request.backendFailureReason = "invalid_change_reason";
        return reply.code(400).send({ error: "A change reason is required" });
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
        try {
          nextPayload = applyAdminSnapshotMutation(
            current.payload,
            request.body,
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
            request.body.operation,
            request.body.profileId,
            reason,
            JSON.stringify(auditDetails(request.body)),
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

  app.get("/admin-api/audits", async (request, reply) => {
    reply.header("Cache-Control", "no-store");
    await authenticatedAdmin(request, pool, jwtKey);
    const limit = parseLimit(request.query?.limit, 50, 100);
    const accountId = String(request.query?.account_id || "").trim();
    const result = await pool.query(
      `select audit.id, audit.operation, audit.profile_id, audit.reason,
              audit.details, audit.revision_before, audit.revision_after,
              audit.created_at, audit.account_id, accounts.email as account_email,
              admins.email as admin_email
         from admin_audit_logs audit
         join admin_accounts admins on admins.id = audit.admin_id
         left join accounts on accounts.id = audit.account_id
        where ($1 = '' or audit.account_id::text = $1)
        order by audit.created_at desc
        limit $2`,
      [accountId, limit],
    );
    return {
      audits: result.rows.map((row) => ({
        ...row,
        revision_before: Number(row.revision_before),
        revision_after: Number(row.revision_after),
      })),
    };
  });
}
