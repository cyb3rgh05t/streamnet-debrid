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
