import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const publicDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../public",
);
const accounts = [
  {
    id: "c359e606-48d3-4f16-924c-243178cbcc01",
    email: "alex.muster@example.test",
    created_at: "2026-08-03T11:24:00.000Z",
    updated_at: "2026-10-28T15:52:00.000Z",
    revision: 12,
    snapshot_updated_at: "2026-10-28T15:52:00.000Z",
    profile_count: 2,
    online_device_count: 1,
  },
  {
    id: "c359e606-48d3-4f16-924c-243178cbcc02",
    email: "samira.demo@example.test",
    created_at: "2026-07-14T08:10:00.000Z",
    updated_at: "2026-10-27T20:16:00.000Z",
    revision: 7,
    snapshot_updated_at: "2026-10-27T20:16:00.000Z",
    profile_count: 3,
    online_device_count: 2,
  },
  {
    id: "c359e606-48d3-4f16-924c-243178cbcc03",
    email: "taylor.preview@example.test",
    created_at: "2026-05-22T17:42:00.000Z",
    updated_at: "2026-10-22T09:05:00.000Z",
    revision: 3,
    snapshot_updated_at: "2026-10-22T09:05:00.000Z",
    profile_count: 1,
    online_device_count: 0,
  },
];
const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
};

function json(reply, status, value) {
  reply.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  reply.end(JSON.stringify(value));
}

async function readBody(request) {
  let body = "";
  for await (const chunk of request) body += chunk;
  return body ? JSON.parse(body) : {};
}

const server = createServer(async (request, reply) => {
  const url = new URL(request.url || "/", "http://127.0.0.1:4173");
  if (request.method === "POST" && url.pathname === "/admin-api/login") {
    const body = await readBody(request);
    if (body.username !== "preview" || body.password !== "preview1234") {
      return json(reply, 401, { error: "Demo-Zugang: preview / preview1234" });
    }
    return json(reply, 200, {
      access_token: "local-admin-preview-token",
      token_type: "bearer",
      expires_in: 1800,
      admin: { id: "preview-admin", username: "preview" },
    });
  }

  if (url.pathname.startsWith("/admin-api/")) {
    if (request.headers.authorization !== "Bearer local-admin-preview-token") {
      return json(reply, 401, { error: "Demo-Anmeldung erforderlich" });
    }
    if (url.pathname === "/admin-api/overview") {
      return json(reply, 200, {
        accounts: 128,
        snapshots: 116,
        active_sessions: 42,
        online_devices: 18,
        events_24h: 1247,
        watch_history_items: 5821,
        watch_state_items: 193,
        database_bytes: 83_886_080,
        profiles: 274,
        new_accounts_24h: 4,
        new_accounts_7d: 19,
        syncs_24h: 67,
        system: {
          checked_at: new Date().toISOString(),
          uptime_seconds: 347820,
          database_connected: true,
          database_query_ms: 12,
          memory_rss_bytes: 157_286_400,
          heap_used_bytes: 48_234_496,
          heap_total_bytes: 67_108_864,
          host_memory_total_bytes: 8_589_934_592,
          host_memory_free_bytes: 4_294_967_296,
          cpu_average_percent: 2.4,
          node_version: "v24.15.0 (Demo)",
          platform: "linux / x64 (Demo)",
          schema_version: "012_device_presence.sql (Demo)",
        },
        versions: { backend: "1.0.033" },
        recent_accounts: accounts,
        recent_audits: [
          { id: "demo-audit-1", operation: "global_add_playlist", account_email: accounts[0].email, reason: "Demo: Senderliste aktualisiert", created_at: "2026-10-29T09:18:00.000Z" },
          { id: "demo-audit-2", operation: "upsert_addon", account_email: accounts[1].email, reason: "Demo: Add-on hinzugefügt", created_at: "2026-10-29T08:42:00.000Z" },
        ],
      });
    }
    if (url.pathname === "/admin-api/updates" || url.pathname === "/admin-api/versions") {
      return json(reply, 200, {
        checked_at: new Date().toISOString(),
        source: "Demo-Versionsdaten (keine Live-Abfrage)",
        components: [
          { component: "backend", version: "1.0.033", source: "Demo-Backend" },
          { component: "web", version: "1.0.071", build: "1793268000000", source: "Demo-Webplayer (simuliert)" },
          { component: "android", version: "2.5.082", published_at: "2026-10-29T12:45:00Z", source: "Demo-APK-Release (simuliert)" },
        ],
      });
    }
    if (request.method === "GET" && url.pathname === "/admin-api/global") {
      return json(reply, 200, {
        total: 128, configurable: 116, skipped: 12,
        playlists: [
          { id: "streamnet_tv", name: "StreamNet TV", accountCount: 84 },
          { id: "demo-playlist", name: "Demo-Playlist", accountCount: 32 },
        ],
        addons: [{ id: "demo-addon", name: "Demo-Add-on", accountCount: 72 }],
        catalogs: [
          { id: "demo-trakt", name: "Demo-Filmliste", sourceType: "TRAKT", accountCount: 28 },
          { id: "demo-system", name: "Beliebte Filme", sourceType: "PREINSTALLED", accountCount: 116 },
          { id: "demo-addon-catalog", name: "Demo-Add-on-Katalog", sourceType: "ADDON", accountCount: 72 },
        ],
      });
    }
    if (url.pathname === "/admin-api/accounts") {
      const query = (url.searchParams.get("q") || "").toLowerCase();
      const onlineOnly = url.searchParams.get("online_only") === "1";
      const filtered = accounts.filter(
        (account) =>
          account.email.includes(query) &&
          (!onlineOnly || account.online_device_count > 0),
      );
      const limit = Number(url.searchParams.get("limit") || 10);
      const offset = Number(url.searchParams.get("offset") || 0);
      return json(reply, 200, {
        accounts: filtered.slice(offset, offset + limit),
        total: filtered.length,
        limit,
        offset,
      });
    }
    if (request.method === "GET" && url.pathname.startsWith("/admin-api/accounts/")) {
      const account = accounts.find(item => url.pathname === `/admin-api/accounts/${item.id}`);
      if (!account) return json(reply, 404, { error: "Demo-Account nicht gefunden" });
      const device = {
        kind: "app_event", removable: false, profile_id: "demo-profile",
        platform: "android", device_type: "tv", app_version: "2.5.082",
        app_version_code: 483, distribution: "sideload",
      };
      return json(reply, 200, {
        account: { ...account, active_sessions: 1, watch_history_items: 24, watch_state_items: 3,
          devices: [
            { ...device, install_id: "demo-live", event_name: "heartbeat",
              last_seen: new Date().toISOString(), online: true, status_label: "Online (Demo)" },
            { ...device, install_id: "demo-old", event_name: "heartbeat",
              last_seen: new Date(Date.now() - 3_600_000).toISOString(), online: false, status_label: "Offline (Demo)" },
            { ...device, install_id: "demo-legacy", platform: "android", device_type: "phone",
              event_name: "app_open", last_seen: new Date().toISOString(), online: false, status_label: "Kein Live-Status" },
          ],
        },
        snapshot: {
          revision: account.revision, updated_at: account.snapshot_updated_at,
          profiles: [{ id: "demo-profile", name: "Wohnzimmer", addonCount: 0,
            playlistCount: 0, catalogCount: 0, watchlistCount: 0 }],
          addons: [], playlists: [], catalogs: [], payload: { profiles: [{ id: "demo-profile", name: "Wohnzimmer" }] },
        },
      });
    }
    if (url.pathname === "/admin-api/audits") {
      return json(reply, 200, {
        audits: [],
        total: 0,
        limit: Number(url.searchParams.get("limit") || 10),
        offset: Number(url.searchParams.get("offset") || 0),
      });
    }
    return json(reply, 501, { error: "Diese Aktion ist im Demo-Modus deaktiviert" });
  }

  const requestedPath =
    url.pathname === "/admin"
      ? "admin.html"
      : url.pathname.startsWith("/admin/")
        ? url.pathname.slice("/admin/".length)
        : url.pathname.startsWith("/assets/")
          ? url.pathname.slice(1)
          : null;
  if (!requestedPath) return json(reply, 404, { error: "Not found" });
  const resolvedPath = path.resolve(publicDirectory, requestedPath);
  if (!resolvedPath.startsWith(`${publicDirectory}${path.sep}`)) {
    return json(reply, 404, { error: "Not found" });
  }
  try {
    const content = await readFile(resolvedPath);
    reply.writeHead(200, {
      "content-type":
        mimeTypes[path.extname(resolvedPath)] || "application/octet-stream",
    });
    reply.end(content);
  } catch (error) {
    if (error.code === "ENOENT") return json(reply, 404, { error: "Not found" });
    console.error(error);
    return json(reply, 500, { error: "Preview-Datei konnte nicht geladen werden" });
  }
});

server.listen(4173, "127.0.0.1", () => {
  console.log("Admin preview ready at http://127.0.0.1:4173/admin");
});
