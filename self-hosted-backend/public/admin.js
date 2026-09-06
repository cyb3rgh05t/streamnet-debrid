const state = {
  token: sessionStorage.getItem("streamnet:admin-token"),
  adminEmail: sessionStorage.getItem("streamnet:admin-email"),
  selectedAccount: null,
  searchTimer: null,
};

const byId = (id) => document.getElementById(id);

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      "content-type": "application/json",
      ...(state.token ? { authorization: `Bearer ${state.token}` } : {}),
      ...(options.headers || {}),
    },
  });
  const body = await response.json().catch(() => ({}));
  if (response.status === 401 && path !== "/admin-api/login") {
    logout();
    throw new Error("Admin-Sitzung abgelaufen");
  }
  if (!response.ok) {
    const error = new Error(
      body.error || body.reason || `HTTP ${response.status}`,
    );
    error.status = response.status;
    error.body = body;
    throw error;
  }
  return body;
}

function showDashboard() {
  byId("login-view").classList.add("hidden");
  byId("dashboard-view").classList.remove("hidden");
  byId("admin-email").textContent = state.adminEmail || "Admin";
}

function logout() {
  state.token = null;
  state.adminEmail = null;
  state.selectedAccount = null;
  sessionStorage.removeItem("streamnet:admin-token");
  sessionStorage.removeItem("streamnet:admin-email");
  byId("dashboard-view").classList.add("hidden");
  byId("login-view").classList.remove("hidden");
  byId("login-password").value = "";
}

function textCell(value, className) {
  const cell = document.createElement("td");
  cell.textContent = value ?? "—";
  if (className) cell.className = className;
  return cell;
}

function formatDate(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatBytes(value) {
  const bytes = Number(value || 0);
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function showToast(message, error = false) {
  const toast = byId("global-message");
  toast.textContent = message;
  toast.style.borderColor = error ? "var(--danger)" : "var(--line-strong)";
  toast.classList.remove("hidden");
  window.setTimeout(() => toast.classList.add("hidden"), 4200);
}

function renderMetrics(metrics) {
  const definitions = [
    ["Accounts", metrics.accounts],
    ["Snapshots", metrics.snapshots],
    ["Aktive Sessions", metrics.active_sessions],
    ["Events · 24 h", metrics.events_24h],
    ["Verlaufseinträge", metrics.watch_history_items],
    ["Datenbank", formatBytes(metrics.database_bytes)],
  ];
  const container = byId("metrics");
  container.replaceChildren();
  for (const [label, value] of definitions) {
    const item = document.createElement("div");
    item.className = "metric";
    const labelNode = document.createElement("span");
    labelNode.className = "metric-label";
    labelNode.textContent = label;
    const valueNode = document.createElement("strong");
    valueNode.className = "metric-value";
    valueNode.textContent = value ?? 0;
    item.append(labelNode, valueNode);
    container.append(item);
  }
}

async function loadOverview() {
  const [metrics, accountResult] = await Promise.all([
    api("/admin-api/overview"),
    api(
      `/admin-api/accounts?q=${encodeURIComponent(byId("account-search").value)}`,
    ),
  ]);
  renderMetrics(metrics);
  renderAccounts(accountResult.accounts);
}

function renderAccounts(accounts) {
  const body = byId("accounts-body");
  body.replaceChildren();
  byId("accounts-empty").classList.toggle("hidden", accounts.length !== 0);
  for (const account of accounts) {
    const row = document.createElement("tr");
    row.dataset.accountId = account.id;
    row.tabIndex = 0;
    const accountCell = document.createElement("td");
    const email = document.createElement("div");
    email.className = "account-primary";
    email.textContent = account.email;
    const id = document.createElement("div");
    id.className = "account-secondary";
    id.textContent = account.id;
    accountCell.append(email, id);
    row.append(
      accountCell,
      textCell(account.profile_count),
      textCell(account.revision),
      textCell(formatDate(account.snapshot_updated_at)),
    );
    row.addEventListener("click", () => openAccount(account.id));
    row.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openAccount(account.id);
      }
    });
    body.append(row);
  }
}

function metricNode(label, value) {
  const node = document.createElement("div");
  node.className = "metric";
  const labelNode = document.createElement("span");
  labelNode.className = "metric-label";
  labelNode.textContent = label;
  const valueNode = document.createElement("strong");
  valueNode.className = "metric-value";
  valueNode.textContent = value ?? 0;
  node.append(labelNode, valueNode);
  return node;
}

async function openAccount(accountId) {
  const data = await api(
    `/admin-api/accounts/${encodeURIComponent(accountId)}`,
  );
  state.selectedAccount = data;
  byId("accounts-view").classList.add("hidden");
  byId("audits-view").classList.add("hidden");
  byId("account-view").classList.remove("hidden");
  byId("page-title").textContent = "Account-Details";

  const heading = byId("account-heading");
  heading.replaceChildren();
  const headingText = document.createElement("div");
  const title = document.createElement("h2");
  title.textContent = data.account.email;
  const id = document.createElement("p");
  id.className = "account-secondary";
  id.textContent = data.account.id;
  headingText.append(title, id);
  heading.append(headingText);

  const stats = byId("account-stats");
  stats.replaceChildren(
    metricNode("Aktive Sessions", data.account.active_sessions),
    metricNode("Watch History", data.account.watch_history_items),
    metricNode("Watch State", data.account.watch_state_items),
    metricNode("Erstellt", formatDate(data.account.created_at)),
  );

  const snapshot = data.snapshot;
  byId("snapshot-revision").textContent = snapshot
    ? `Revision ${snapshot.revision}`
    : "Kein Snapshot";
  byId("payload-json").textContent = snapshot
    ? JSON.stringify(snapshot.payload, null, 2)
    : "Kein Cloud-Snapshot vorhanden.";
  renderProfiles(snapshot?.profiles || []);
  byId("mutation-form").classList.toggle("hidden", !snapshot);
  if (snapshot) setOperationTemplate();
}

function renderProfiles(profiles) {
  const grid = byId("profiles-grid");
  const select = byId("mutation-profile");
  grid.replaceChildren();
  select.replaceChildren();
  for (const profile of profiles) {
    const row = document.createElement("article");
    row.className = "profile-row";
    const title = document.createElement("strong");
    title.textContent = profile.name;
    const id = document.createElement("div");
    id.className = "account-secondary";
    id.textContent = profile.id;
    const counts = document.createElement("div");
    counts.className = "profile-counts";
    for (const [label, value] of [
      ["Add-ons", profile.addonCount],
      ["Playlists", profile.playlistCount],
      ["Kataloge", profile.catalogCount],
      ["Merkliste", profile.watchlistCount],
    ]) {
      const count = document.createElement("span");
      count.textContent = `${label}: `;
      const number = document.createElement("b");
      number.textContent = value;
      count.append(number);
      counts.append(count);
    }
    row.append(title, id, counts);
    grid.append(row);

    const option = document.createElement("option");
    option.value = profile.id;
    option.textContent = profile.name;
    select.append(option);
  }
}

const operationTemplates = {
  upsert_addon: {
    id: "example-addon",
    name: "Example Add-on",
    version: "1.0.0",
    description: "",
    isEnabled: true,
    type: "CUSTOM",
    runtimeKind: "STREMIO",
    installSource: "DIRECT_URL",
    url: "https://example.com/manifest.json",
  },
  upsert_playlist: {
    id: "playlist-id",
    name: "Playlist name",
    m3uUrl: "https://provider.example/list.m3u",
    epgUrl: "https://provider.example/epg.xml",
    enabled: true,
    importLiveTv: true,
    importVod: true,
    importSeries: true,
  },
  set_profile_field: "Orange",
};

function setOperationTemplate() {
  const operation = byId("mutation-operation").value;
  byId("field-controls").classList.toggle(
    "hidden",
    operation !== "set_profile_field",
  );
  byId("mutation-data").value = JSON.stringify(
    operationTemplates[operation],
    null,
    2,
  );
  byId("mutation-warning").textContent =
    operation === "upsert_addon"
      ? "Add-ons sind geteilter Account-Status und werden für alle vorhandenen Profile gespeichert. Die Änderung erzeugt sofort eine neue Cloud-Revision."
      : "Diese Änderung gilt nur für das gewählte Profil und erzeugt sofort eine neue Cloud-Revision.";
}

async function submitMutation(event) {
  event.preventDefault();
  const message = byId("mutation-message");
  message.className = "message";
  message.textContent = "Änderung wird geprüft…";
  try {
    const operation = byId("mutation-operation").value;
    const request = {
      operation,
      profileId: byId("mutation-profile").value,
      data: JSON.parse(byId("mutation-data").value),
      reason: byId("mutation-reason").value,
      expectedRevision: state.selectedAccount.snapshot.revision,
    };
    if (operation === "set_profile_field") {
      request.rootKey = byId("mutation-root").value;
      request.field = byId("mutation-field").value;
    }
    await api(
      `/admin-api/accounts/${encodeURIComponent(state.selectedAccount.account.id)}/snapshot`,
      { method: "PATCH", body: JSON.stringify(request) },
    );
    message.textContent = "Änderung gespeichert und protokolliert.";
    byId("mutation-reason").value = "";
    await openAccount(state.selectedAccount.account.id);
  } catch (error) {
    message.className = "message error";
    message.textContent =
      error.status === 409
        ? "Der Snapshot wurde inzwischen geändert. Die Ansicht wurde neu geladen."
        : error.message;
    if (error.status === 409)
      await openAccount(state.selectedAccount.account.id);
  }
}

async function loadAudits() {
  const result = await api("/admin-api/audits");
  const body = byId("audits-body");
  body.replaceChildren();
  for (const audit of result.audits) {
    const row = document.createElement("tr");
    row.append(
      textCell(formatDate(audit.created_at)),
      textCell(audit.account_email || audit.account_id || "Gelöscht"),
      textCell(audit.operation),
      textCell(audit.profile_id),
      textCell(`${audit.revision_before} → ${audit.revision_after}`),
      textCell(audit.reason),
    );
    body.append(row);
  }
}

function selectView(view) {
  document.querySelectorAll(".nav-item").forEach((item) => {
    item.classList.toggle("active", item.dataset.view === view);
  });
  byId("account-view").classList.add("hidden");
  byId("accounts-view").classList.toggle("hidden", view !== "accounts");
  byId("audits-view").classList.toggle("hidden", view !== "audits");
  byId("page-title").textContent =
    view === "accounts" ? "Accounts" : "Audit-Protokoll";
  (view === "accounts" ? loadOverview() : loadAudits()).catch((error) =>
    showToast(error.message, true),
  );
}

byId("login-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const errorNode = byId("login-error");
  errorNode.textContent = "";
  try {
    const result = await api("/admin-api/login", {
      method: "POST",
      body: JSON.stringify({
        email: byId("login-email").value,
        password: byId("login-password").value,
      }),
    });
    state.token = result.access_token;
    state.adminEmail = result.admin.email;
    sessionStorage.setItem("streamnet:admin-token", state.token);
    sessionStorage.setItem("streamnet:admin-email", state.adminEmail);
    showDashboard();
    await loadOverview();
  } catch (error) {
    errorNode.textContent = error.message;
  }
});

byId("logout-button").addEventListener("click", logout);
byId("refresh-button").addEventListener("click", () =>
  loadOverview().catch((error) => showToast(error.message, true)),
);
byId("back-button").addEventListener("click", () => selectView("accounts"));
byId("mutation-operation").addEventListener("change", setOperationTemplate);
byId("mutation-form").addEventListener("submit", submitMutation);
byId("copy-payload").addEventListener("click", async () => {
  await navigator.clipboard.writeText(byId("payload-json").textContent);
  showToast("Maskiertes JSON kopiert.");
});
byId("account-search").addEventListener("input", () => {
  window.clearTimeout(state.searchTimer);
  state.searchTimer = window.setTimeout(
    () => loadOverview().catch((error) => showToast(error.message, true)),
    250,
  );
});
document.querySelectorAll(".nav-item").forEach((item) => {
  item.addEventListener("click", () => selectView(item.dataset.view));
});

if (state.token) {
  showDashboard();
  loadOverview().catch((error) => showToast(error.message, true));
}
