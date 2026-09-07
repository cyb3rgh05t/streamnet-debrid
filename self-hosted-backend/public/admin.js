const state = {
  token: sessionStorage.getItem("streamnet:admin-token"),
  adminEmail: sessionStorage.getItem("streamnet:admin-email"),
  selectedAccount: null,
  searchTimer: null,
  pendingRequests: 0,
};

const byId = (id) => document.getElementById(id);

const metricIcons = {
  accounts:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  snapshots:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>',
  sessions:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>',
  events:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
  history:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>',
  database:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>',
  created:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
};

const svgParser = new DOMParser();
function svgIcon(markup) {
  const doc = svgParser.parseFromString(markup, "image/svg+xml");
  return document.importNode(doc.documentElement, true);
}

function setLoading(active) {
  state.pendingRequests += active ? 1 : -1;
  if (state.pendingRequests < 0) state.pendingRequests = 0;
  byId("page-loading").classList.toggle("active", state.pendingRequests > 0);
}

async function api(path, options = {}) {
  setLoading(true);
  try {
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
  } finally {
    setLoading(false);
  }
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
  toast.classList.toggle("error", error);
  toast.classList.remove("hidden");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(
    () => toast.classList.add("hidden"),
    4200,
  );
}

function renderMetrics(metrics) {
  const definitions = [
    ["accounts", "Accounts", metrics.accounts],
    ["snapshots", "Snapshots", metrics.snapshots],
    ["sessions", "Aktive Sessions", metrics.active_sessions],
    ["events", "Events · 24 h", metrics.events_24h],
    ["history", "Verlaufseinträge", metrics.watch_history_items],
    ["database", "Datenbank", formatBytes(metrics.database_bytes)],
  ];
  const container = byId("metrics");
  container.replaceChildren();
  definitions.forEach(([icon, label, value], index) => {
    const item = document.createElement("div");
    item.className = "metric";
    item.style.animationDelay = `${index * 35}ms`;
    const iconNode = document.createElement("span");
    iconNode.className = "metric-icon";
    if (metricIcons[icon]) iconNode.append(svgIcon(metricIcons[icon]));
    const body = document.createElement("div");
    body.className = "metric-body";
    const labelNode = document.createElement("span");
    labelNode.className = "metric-label";
    labelNode.textContent = label;
    const valueNode = document.createElement("strong");
    valueNode.className = "metric-value";
    valueNode.textContent = value ?? 0;
    body.append(labelNode, valueNode);
    item.append(iconNode, body);
    container.append(item);
  });
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

function metricNode(icon, label, value) {
  const node = document.createElement("div");
  node.className = "metric";
  const iconNode = document.createElement("span");
  iconNode.className = "metric-icon";
  if (metricIcons[icon]) iconNode.append(svgIcon(metricIcons[icon]));
  const body = document.createElement("div");
  body.className = "metric-body";
  const labelNode = document.createElement("span");
  labelNode.className = "metric-label";
  labelNode.textContent = label;
  const valueNode = document.createElement("strong");
  valueNode.className = "metric-value";
  valueNode.textContent = value ?? 0;
  body.append(labelNode, valueNode);
  node.append(iconNode, body);
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
    metricNode("sessions", "Aktive Sessions", data.account.active_sessions),
    metricNode("history", "Watch History", data.account.watch_history_items),
    metricNode("events", "Watch State", data.account.watch_state_items),
    metricNode("created", "Erstellt", formatDate(data.account.created_at)),
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

function setButtonBusy(button, busy, busyLabel) {
  if (busy) {
    button.dataset.originalLabel = button.textContent;
    button.disabled = true;
    button.replaceChildren();
    const spinner = document.createElement("span");
    spinner.className = "spinner";
    button.append(
      spinner,
      document.createTextNode(busyLabel || "Bitte warten\u2026"),
    );
  } else {
    button.disabled = false;
    button.textContent = button.dataset.originalLabel || button.textContent;
  }
}

async function submitMutation(event) {
  event.preventDefault();
  const message = byId("mutation-message");
  const submitButton = event.target.querySelector('button[type="submit"]');
  message.className = "message";
  message.textContent = "Änderung wird geprüft…";
  setButtonBusy(submitButton, true, "Wird gespeichert…");
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
  } finally {
    setButtonBusy(submitButton, false);
  }
}

async function loadAudits() {
  const result = await api("/admin-api/audits");
  const body = byId("audits-body");
  body.replaceChildren();
  byId("audits-empty").classList.toggle("hidden", result.audits.length !== 0);
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
  const submitButton = event.target.querySelector('button[type="submit"]');
  errorNode.textContent = "";
  setButtonBusy(submitButton, true, "Anmelden…");
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
  } finally {
    setButtonBusy(submitButton, false);
  }
});

byId("logout-button").addEventListener("click", logout);
byId("refresh-button").addEventListener("click", (event) => {
  const button = event.currentTarget;
  setButtonBusy(button, true, "Aktualisieren…");
  loadOverview()
    .catch((error) => showToast(error.message, true))
    .finally(() => setButtonBusy(button, false));
});
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
