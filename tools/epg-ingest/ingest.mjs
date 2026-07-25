#!/usr/bin/env node

const supabaseUrl = process.env.SUPABASE_URL || "";
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const refreshLimit = Number(process.env.EPG_REFRESH_LIMIT || "20");

function fail(message) {
  console.error(`[epg-ingest] ${message}`);
  process.exit(1);
}

if (!supabaseUrl) fail("SUPABASE_URL is missing");
if (!serviceRole) fail("SUPABASE_SERVICE_ROLE_KEY is missing");

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      apikey: serviceRole,
      Authorization: `Bearer ${serviceRole}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`HTTP ${response.status}: ${text}`);
  }

  return response.json();
}

async function loadRefreshCandidates() {
  const nowIso = new Date().toISOString();
  const params = new URLSearchParams();
  params.set(
    "select",
    "source_key,kind,owner_user,url,wanted_channels,expires_at,status",
  );
  params.set(
    "or",
    `(expires_at.is.null,expires_at.lt.${nowIso},status.eq.pending,status.eq.error)`,
  );
  params.set("order", "last_requested_at.desc");
  params.set("limit", String(refreshLimit));

  const url = `${supabaseUrl}/rest/v1/epg_source?${params.toString()}`;
  return fetchJson(url);
}

async function main() {
  console.log("[epg-ingest] worker scaffold starting");
  const rows = await loadRefreshCandidates();

  console.log(`[epg-ingest] candidates=${rows.length}`);
  for (const row of rows) {
    console.log(
      `[epg-ingest] TODO parse source=${row.source_key} kind=${row.kind} ` +
        `channels=${Array.isArray(row.wanted_channels) ? row.wanted_channels.length : 0}`,
    );
  }

  console.log("[epg-ingest] scaffold completed");
}

main().catch((error) => {
  console.error("[epg-ingest] failed", error);
  process.exit(1);
});
