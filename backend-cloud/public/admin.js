const state = {
  token: sessionStorage.getItem("streamnet:admin-token"),
  selectedAccount: null,
  searchTimer: null,
  pendingRequests: 0,
  accounts: { limit: 10, offset: 0, total: 0 },
  onlineOnly: false,
  audits: { limit: 10, offset: 0, total: 0 },
  accountAudits: { limit: 10, offset: 0, total: 0 },
  global: null,
};

const byId = (id) => document.getElementById(id);

const metricIcons = {
  accounts:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  snapshots:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>',
  sessions:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>',
  events:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
  history:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>',
  database:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>',
  created:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
};

const svgParser = new DOMParser();
function svgIcon(markup) {
  const doc = svgParser.parseFromString(markup, "image/svg+xml");
  return document.importNode(doc.documentElement, true);
}

const chevronIconMarkup =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>';

// Skins a native <select> with an accent-themed dropdown while keeping the
// original element as the source of truth for value/change events.
function enhanceSelect(select) {
  if (select.dataset.enhanced) return;
  select.dataset.enhanced = "true";

  const wrapper = document.createElement("div");
  wrapper.className = "custom-select";
  select.parentNode.insertBefore(wrapper, select);
  select.classList.add("native-select");
  wrapper.append(select);

  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = "custom-select-trigger";
  const label = document.createElement("span");
  trigger.append(label, svgIcon(chevronIconMarkup));
  wrapper.append(trigger);

  const listbox = document.createElement("div");
  listbox.className = "custom-select-list hidden";
  wrapper.append(listbox);

  function syncTrigger() {
    const option = select.options[select.selectedIndex];
    label.textContent = option ? option.textContent : "";
    trigger.disabled = select.disabled;
  }

  function buildOptions() {
    listbox.replaceChildren();
    [...select.options].forEach((option, index) => {
      const item = document.createElement("button");
      item.type = "button";
      item.className = "custom-select-option";
      item.textContent = option.textContent;
      item.disabled = option.disabled;
      if (index === select.selectedIndex) item.classList.add("selected");
      item.addEventListener("click", () => {
        select.selectedIndex = index;
        select.dispatchEvent(new Event("change", { bubbles: true }));
        closeList();
      });
      listbox.append(item);
    });
  }

  function openList() {
    if (select.disabled) return;
    buildOptions();
    listbox.classList.remove("hidden");
    trigger.classList.add("open");
  }

  function closeList() {
    listbox.classList.add("hidden");
    trigger.classList.remove("open");
    syncTrigger();
  }

  trigger.addEventListener("click", () => {
    if (listbox.classList.contains("hidden")) openList();
    else closeList();
  });
  trigger.addEventListener("keydown", (event) => {
    if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) {
      event.preventDefault();
      openList();
      listbox.querySelector(".custom-select-option:not(:disabled)")?.focus();
    }
  });
  listbox.addEventListener("keydown", (event) => {
    const options = [
      ...listbox.querySelectorAll(".custom-select-option:not(:disabled)"),
    ];
    const currentIndex = options.indexOf(document.activeElement);
    if (event.key === "ArrowDown") {
      event.preventDefault();
      options[(currentIndex + 1) % options.length]?.focus();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      options[(currentIndex - 1 + options.length) % options.length]?.focus();
    } else if (event.key === "Escape") {
      closeList();
      trigger.focus();
    }
  });
  document.addEventListener("click", (event) => {
    if (!wrapper.contains(event.target)) closeList();
  });

  new MutationObserver(syncTrigger).observe(select, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["disabled"],
  });
  syncTrigger();
}

function setLoading(active) {
  state.pendingRequests += active ? 1 : -1;
  if (state.pendingRequests < 0) state.pendingRequests = 0;
  byId("page-loading").classList.toggle("active", state.pendingRequests > 0);
}

async function api(path, options = {}) {
  setLoading(true);
  try {
    const hasBody = options.body !== undefined && options.body !== null;
    const response = await fetch(path, {
      ...options,
      headers: {
        ...(hasBody ? { "content-type": "application/json" } : {}),
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
}

function logout() {
  state.token = null;
  state.selectedAccount = null;
  state.global = null;
  sessionStorage.removeItem("streamnet:admin-token");
  sessionStorage.removeItem("streamnet:admin-username");
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
  const units = ["B", "KB", "MB", "GB", "TB"];
  let amount = bytes;
  let unit = 0;
  while (amount >= 1024 && unit < units.length - 1) {
    amount /= 1024;
    unit += 1;
  }
  return `${amount.toLocaleString("de-DE", { maximumFractionDigits: 1 })} ${units[unit]}`;
}

function formatAuditOperation(operation) {
  const labels = {
    upsert_addon: "Add-on hinzugefügt / aktualisiert",
    delete_addon: "Add-on entfernt",
    upsert_playlist: "Playlist hinzugefügt / aktualisiert",
    delete_playlist: "Playlist entfernt",
    delete_profile: "Profil entfernt",
    set_profile_field: "Profileinstellung geändert",
    edit_payload: "Cloud-Daten bearbeitet",
    change_streamnet_host: "StreamNet-TV-Server geändert",
    clear_streamnet_host_override: "StreamNet-TV-Server zurückgesetzt",
    revoke_sessions: "Alle Logins widerrufen",
    delete_account: "Account gelöscht",
    add_playlist: "Playlist hinzugefügt / aktualisiert",
    edit_playlist: "Playlist bearbeitet",
    clear_playlists: "Alle Playlists entfernt",
    change_xtream_host: "Xtream-/StreamNet-TV-Server geändert",
    add_addon: "Add-on hinzugefügt / aktualisiert",
    edit_addon: "Add-on bearbeitet",
    clear_addons: "Alle Add-ons entfernt",
    add_catalog: "Katalog hinzugefügt / aktualisiert",
    rename_catalog: "Katalog umbenannt",
    set_catalog_enabled: "Katalogaktivierung geändert",
    delete_catalog: "Katalog entfernt / ausgeblendet",
  };
  const global = typeof operation === "string" && operation.startsWith("global_");
  const key = global ? operation.slice(7) : operation;
  const label = Object.hasOwn(labels, key) ? labels[key] : null;
  return label ? `${global ? "Global: " : ""}${label}` : operation;
}

function showToast(message, error = false) {
  const toast = byId("global-message");
  toast.textContent = message;
  toast.classList.toggle("error", error);
  toast.classList.remove("hidden");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(
    () => toast.classList.add("hidden"),
    error ? 9000 : 6500,
  );
}

function setMessage(node, text, type = "info") {
  node.className = `message ${type}`;
  node.textContent = text;
  if (text) node.scrollIntoView({ block: "nearest", behavior: "smooth" });
}

function openAdminDialog(options) {
  return new Promise((resolve) => {
    const backdrop = byId("admin-dialog");
    const panel = backdrop.querySelector(".dialog-panel");
    const title = byId("dialog-title");
    const eyebrow = byId("dialog-eyebrow");
    const message = byId("dialog-message");
    const inputWrap = byId("dialog-input-wrap");
    const inputLabel = byId("dialog-input-label");
    const input = byId("dialog-input");
    const error = byId("dialog-error");
    const cancel = byId("dialog-cancel");
    const confirm = byId("dialog-confirm");
    const needsInput = options.input !== false;

    panel.classList.toggle("danger", options.danger === true);
    title.textContent = options.title || "Aktion bestätigen";
    eyebrow.textContent = options.eyebrow || "BESTÄTIGUNG";
    message.textContent = options.message || "";
    inputWrap.classList.toggle("hidden", !needsInput);
    inputLabel.textContent = options.inputLabel || "Eingabe";
    input.type = options.inputType || "text";
    input.value = "";
    input.placeholder = options.placeholder || "";
    error.textContent = "";
    confirm.textContent = options.confirmLabel || "Bestätigen";
    cancel.textContent = options.cancelLabel || "Abbrechen";
    backdrop.classList.remove("hidden");

    const cleanup = (value) => {
      backdrop.classList.add("hidden");
      confirm.removeEventListener("click", onConfirm);
      cancel.removeEventListener("click", onCancel);
      backdrop.removeEventListener("click", onBackdropClick);
      document.removeEventListener("keydown", onKeyDown);
      resolve(value);
    };
    const validate = () => {
      if (!needsInput) return true;
      const value = input.value.trim();
      if (
        options.requiredText !== undefined &&
        value !== options.requiredText
      ) {
        error.textContent =
          options.requiredTextError || "Die Eingabe stimmt nicht überein.";
        return false;
      }
      if (options.minLength && value.length < options.minLength) {
        error.textContent = `Bitte mindestens ${options.minLength} Zeichen eingeben.`;
        return false;
      }
      if (options.maxLength && value.length > options.maxLength) {
        error.textContent = `Bitte maximal ${options.maxLength} Zeichen eingeben.`;
        return false;
      }
      return true;
    };
    function onConfirm() {
      if (!validate()) return;
      cleanup(needsInput ? input.value.trim() : true);
    }
    function onCancel() {
      cleanup(null);
    }
    function onBackdropClick(event) {
      if (event.target === backdrop) onCancel();
    }
    function onKeyDown(event) {
      if (event.key === "Escape") onCancel();
      if (event.key === "Enter" && document.activeElement === input)
        onConfirm();
    }

    confirm.addEventListener("click", onConfirm);
    cancel.addEventListener("click", onCancel);
    backdrop.addEventListener("click", onBackdropClick);
    document.addEventListener("keydown", onKeyDown);
    window.setTimeout(() => (needsInput ? input : confirm).focus(), 0);
  });
}

async function promptReason(message, danger = false) {
  return openAdminDialog({
    title: "Änderungsgrund",
    eyebrow: "PROTOKOLL",
    message,
    inputLabel: "Grund",
    placeholder: "Kurz beschreiben, warum diese Änderung nötig ist",
    minLength: 3,
    maxLength: 500,
    confirmLabel: "Weiter",
    danger,
  });
}

async function confirmAction({ title, message, confirmLabel, danger = false }) {
  return openAdminDialog({
    title,
    message,
    confirmLabel,
    danger,
    input: false,
  });
}

function normalizeStremioManifestUrl(value) {
  let clean = String(value || "").trim();
  if (!clean) return "";
  if (clean.startsWith("stremio://")) {
    const payload = clean.slice("stremio://".length).trim();
    clean = /^https?:\/\//i.test(payload) ? payload : `https://${payload}`;
  }
  if (!/^https?:\/\//i.test(clean)) clean = `https://${clean}`;
  clean = clean.split("#", 1)[0].trim();
  clean = clean.replace(/\/manifest\.json[^/?]*(?=\?|$)/i, "/manifest.json");
  const [base, query = ""] = clean.split("?", 2);
  const manifestBase = base.replace(/\/+$/, "").endsWith("/manifest.json")
    ? base.replace(/\/+$/, "")
    : `${base.replace(/\/+$/, "")}/manifest.json`;
  return query ? `${manifestBase}?${query}` : manifestBase;
}

function normalizeAddonLinkField() {
  const input = byId("addon-url");
  const normalized = normalizeStremioManifestUrl(input.value);
  if (!normalized) return;
  input.value = normalized;
}

function renderMetrics(metrics) {
  const definitions = [
    ["accounts", "Accounts", metrics.accounts],
    ["snapshots", "Snapshots", metrics.snapshots],
    ["sessions", "Geräte online", metrics.online_devices, "online-filter"],
    ["sessions", "Gültige Logins", metrics.active_sessions, "sessions-info"],
    ["events", "Events · 24 h", metrics.events_24h],
    ["database", "Datenbank", formatBytes(metrics.database_bytes)],
  ];
  const container = byId("metrics");
  container.replaceChildren();
  definitions.forEach(([icon, label, value, action], index) => {
    const item = document.createElement(action ? "button" : "div");
    item.className = "metric";
    if (action) {
      item.type = "button";
      item.classList.add("metric-action");
      item.dataset.action = action;
    }
    if (action === "online-filter" && state.onlineOnly)
      item.classList.add("active");
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
    if (action === "online-filter") {
      item.title = "Nur Accounts mit aktuell online gesehenen Geräten anzeigen";
      item.addEventListener("click", () => {
        state.onlineOnly = true;
        state.accounts.offset = 0;
        selectView("accounts");
      });
    } else if (action === "sessions-info") {
      item.title =
        "Gültige Logins sind aktive Refresh-Sessions. Ein Gerät kann mehrere Logins haben; Geräte online basiert auf authentifizierten Heartbeats der letzten 90 Sekunden.";
      item.addEventListener("click", () =>
        showToast(
          "Gültige Logins = aktive Refresh-Sessions. Revisionen = Cloud-Snapshot-Versionen; jede gespeicherte Account-/Profiländerung erhöht sie um 1.",
        ),
      );
    }
    container.append(item);
  });
}

async function loadDashboard() {
  const started = performance.now();
  let metrics;
  try {
    metrics = await api("/admin-api/overview");
  } catch (error) {
    byId("dashboard-system").replaceChildren();
    renderDashboardFacts("dashboard-system", [["Backend / Datenbank", "Prüfung fehlgeschlagen"], ["Fehler", error.message]]);
    throw error;
  }
  const responseMs = Math.round(performance.now() - started);
  renderMetrics(metrics);
  const system = metrics.system;
  const hours = Math.floor(system.uptime_seconds / 3600);
  renderDashboardFacts("dashboard-system", [
    ["Admin API", `Erreichbar · ${responseMs} ms`],
    ["Datenbank", system.database_connected ? `Verbunden · Abfrage ${system.database_query_ms} ms` : "Nicht verbunden"],
    ["Laufzeit", `${Math.floor(hours / 24)} Tage · ${hours % 24} Std. · ${Math.floor(system.uptime_seconds / 60) % 60} Min.`],
    ["Node.js", system.node_version],
    ["Plattform", system.platform],
    ["Messzeitpunkt", formatDate(system.checked_at)],
  ]);
  renderDashboardFacts("dashboard-cloud", [
    ["Profile", metrics.profiles],
    ["Wiedergabeverlauf", metrics.watch_history_items],
    ["Gesehen-Markierungen", metrics.watch_state_items],
    ["Neue Accounts · 24 h", metrics.new_accounts_24h],
    ["Neue Accounts · 7 Tage", metrics.new_accounts_7d],
    ["Snapshots aktualisiert · 24 h", metrics.syncs_24h],
  ]);
  renderDashboardFacts("dashboard-resources", [
    ["Datenbankgröße", formatBytes(metrics.database_bytes)],
    ["Prozess-RAM (RSS)", formatBytes(system.memory_rss_bytes)],
    ["JS-Heap belegt / reserviert", `${formatBytes(system.heap_used_bytes)} / ${formatBytes(system.heap_total_bytes)}`],
    ["Host-RAM frei / gesamt", `${formatBytes(system.host_memory_free_bytes)} / ${formatBytes(system.host_memory_total_bytes)}`],
    ["Prozess-CPU · Ø seit Start", `${system.cpu_average_percent.toLocaleString("de-DE")} %`],
  ]);
  byId("dashboard-backend-version").textContent = metrics.versions.backend;
  byId("dashboard-backend-release").href = versionReleaseUrl("backend", metrics.versions.backend);
  renderDashboardActivity("dashboard-recent-accounts", metrics.recent_accounts.map(account => ({
    title: account.email, detail: `Registriert · ${formatDate(account.created_at)}`,
  })), "Noch keine Accounts vorhanden.");
  renderDashboardActivity("dashboard-recent-audits", metrics.recent_audits.map(audit => ({
    title: formatAuditOperation(audit.operation),
    detail: `${audit.account_email || "Account entfernt"} · ${formatDate(audit.created_at)}${audit.reason ? ` · ${audit.reason}` : ""}`,
  })), "Noch keine Änderungen protokolliert.");
  byId("dashboard-updated").textContent = new Intl.DateTimeFormat("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());
  await loadLiveVersions();
}

function renderDashboardFacts(id, entries) {
  const container = byId(id);
  container.replaceChildren();
  for (const [label, value] of entries) {
    const row = document.createElement("div");
    const term = document.createElement("dt");
    term.textContent = label;
    const description = document.createElement("dd");
    description.textContent = typeof value === "number" ? value.toLocaleString("de-DE") : value;
    row.append(term, description);
    container.append(row);
  }
}

function renderDashboardActivity(id, entries, emptyLabel) {
  const container = byId(id);
  container.replaceChildren();
  for (const entry of entries) {
    const item = document.createElement("li");
    const title = document.createElement("strong");
    title.textContent = entry.title;
    const detail = document.createElement("span");
    detail.textContent = entry.detail;
    item.append(title, detail);
    container.append(item);
  }
  if (!entries.length) {
    const item = document.createElement("li");
    item.textContent = emptyLabel;
    container.append(item);
  }
}

function versionReleaseUrl(component, version) {
  const repository = "https://github.com/cyb3rgh05t/streamnet-debrid";
  if (component === "android") return `${repository}/releases/tag/${encodeURIComponent(version)}`;
  const label = component === "backend" ? "Backend" : "Web";
  return `${repository}/blob/main/CHANGELOG.md#:~:text=${encodeURIComponent(`[${label} ${version}]`)}`;
}

async function loadLiveVersions() {
  for (const component of ["web", "android"]) {
    byId(`dashboard-${component}-version`).textContent = "—";
    byId(`dashboard-${component}-release`).href = component === "android"
      ? "https://github.com/cyb3rgh05t/streamnet-debrid/releases"
      : "https://github.com/cyb3rgh05t/streamnet-debrid/blob/main/CHANGELOG.md";
  }
  byId("dashboard-web-source").textContent = "web.streamnet.live · Wird geprüft...";
  byId("dashboard-android-build").textContent = "Veröffentlichtes APK-Release · Wird geprüft...";
  try {
    const result = await api("/admin-api/versions");
    for (const component of result.components) {
      let detail;
      if (component.error) {
        detail = `Prüfung fehlgeschlagen: ${component.error}`;
      } else {
        byId(`dashboard-${component.component}-version`).textContent = component.version;
        byId(`dashboard-${component.component}-release`).href = versionReleaseUrl(component.component, component.version);
        detail = component.source;
        if (component.component === "web" && component.build) detail += ` · Build ${component.build}`;
        if (component.component === "android") detail += ` · Veröffentlicht ${formatDate(component.published_at)}`;
      }
      if (component.component === "web") byId("dashboard-web-source").textContent = detail;
      if (component.component === "android") byId("dashboard-android-build").textContent = detail;
    }
  } catch (error) {
    const message = `Versionsprüfung fehlgeschlagen: ${error.message}`;
    byId("dashboard-web-source").textContent = message;
    byId("dashboard-android-build").textContent = message;
    showToast(error.message, true);
  }
}

let accountsRequestId = 0;
async function loadAccounts() {
  const requestId = ++accountsRequestId;
  const token = state.token;
  const search = byId("account-search").value;
  const { limit, offset } = state.accounts;
  const onlineOnly = state.onlineOnly;
  const accountResult = await api(
    `/admin-api/accounts?q=${encodeURIComponent(search)}&limit=${limit}&offset=${offset}&online_only=${onlineOnly ? "1" : "0"}`,
  );
  if (requestId !== accountsRequestId || token !== state.token ||
      search !== byId("account-search").value || onlineOnly !== state.onlineOnly ||
      limit !== state.accounts.limit || offset !== state.accounts.offset) return;
  state.accounts.total = accountResult.total;
  state.accounts.limit = accountResult.limit;
  state.accounts.offset = accountResult.offset;
  byId("accounts-filter-note").classList.toggle("hidden", !state.onlineOnly);
  renderAccounts(accountResult.accounts);
  renderPagination("accounts-pagination", state.accounts, (offset) => {
    state.accounts.offset = offset;
    loadAccounts().catch((error) => showToast(error.message, true));
  });
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
      textCell(account.online_device_count || 0),
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

const deviceTypeLabels = {
  phone: "Mobile",
  tablet: "Tablet",
  tv: "TV",
  web: "Web",
};

function renderPagination(containerId, page, onPage) {
  const container = byId(containerId);
  container.replaceChildren();
  const total = Number(page.total || 0);
  const limit = Number(page.limit || 10);
  const offset = Number(page.offset || 0);
  if (total <= limit && offset === 0) {
    container.classList.add("hidden");
    return;
  }
  container.classList.remove("hidden");
  const start = total === 0 ? 0 : offset + 1;
  const end = Math.min(offset + limit, total);
  const label = document.createElement("span");
  label.textContent = `${start}-${end} von ${total}`;
  const previous = document.createElement("button");
  previous.type = "button";
  previous.className = "button secondary";
  previous.textContent = "Zurück";
  previous.disabled = offset <= 0;
  previous.addEventListener("click", () => onPage(Math.max(0, offset - limit)));
  const next = document.createElement("button");
  next.type = "button";
  next.className = "button secondary";
  next.textContent = "Weiter";
  next.disabled = offset + limit >= total;
  next.addEventListener("click", () => onPage(offset + limit));
  container.append(label, previous, next);
}

function latestDeviceEntries(devices) {
  const seen = new Set();
  return [...devices].sort((a, b) => Date.parse(b.last_seen) - Date.parse(a.last_seen))
    .map(device => {
      const key = JSON.stringify([device.kind, device.platform || "", device.device_type || ""]);
      const older = seen.has(key);
      seen.add(key);
      return { device, older };
    });
}

function formatDeviceEvent(event) {
  const labels = {
    heartbeat: "Live-Status gemeldet",
    app_open: "App gestartet",
    active_session: "Login erstellt",
  };
  return Object.hasOwn(labels, event) ? labels[event] : event || "—";
}

function liveDeviceEntries(devices) {
  return devices.filter(device => device.kind !== "session" && device.event_name === "heartbeat");
}

function renderDeviceBadges(devices, preserveExpansion = false) {
  const liveDevices = liveDeviceEntries(devices);
  const container = byId("account-devices");
  const body = byId("account-devices-body");
  body.replaceChildren();
  container.classList.toggle("hidden", liveDevices.length === 0);
  byId("account-devices-empty").classList.toggle("hidden", liveDevices.length !== 0);
  const profileNames = new Map(
    (state.selectedAccount?.snapshot?.profiles || []).map((profile) => [
      profile.id,
      profile.name || profile.id,
    ]),
  );
  const entries = latestDeviceEntries(liveDevices);
  const olderCount = entries.filter(entry => entry.older).length;
  const toggle = byId("account-devices-toggle");
  const expanded = preserveExpansion && toggle.getAttribute("aria-expanded") === "true";
  toggle.classList.toggle("hidden", olderCount === 0);
  toggle.setAttribute("aria-expanded", String(expanded));
  toggle.textContent = expanded ? "Ältere Einträge ausblenden" : `Ältere Einträge anzeigen (${olderCount})`;
  toggle.onclick = () => {
    const expanded = toggle.getAttribute("aria-expanded") !== "true";
    toggle.setAttribute("aria-expanded", String(expanded));
    toggle.textContent = expanded ? "Ältere Einträge ausblenden" : `Ältere Einträge anzeigen (${olderCount})`;
    body.querySelectorAll("[data-older-device]").forEach(row => row.classList.toggle("hidden", !expanded));
  };
  for (const { device, older } of entries) {
    const row = document.createElement("tr");
    if (older) {
      row.dataset.olderDevice = "true";
      row.classList.toggle("hidden", !expanded);
    }
    const status = document.createElement("span");
    status.className = `device-status${device.online ? " online" : ""}${device.kind === "session" ? " session" : ""}`;
    status.textContent =
      device.status_label || (device.online ? "Online" : "Offline");
    const deviceCell = document.createElement("td");
    const deviceType = badgeNode(deviceTypeLabels[device.device_type] || device.device_type || "Unbekannt");
    deviceType.classList.add("device-type-badge");
    const deviceMeta = document.createElement("div");
    deviceMeta.className = "device-meta";
    deviceMeta.append(deviceType);
    if (device.platform) deviceMeta.append(badgeNode(device.platform === "android" ? "Android" : device.platform === "web" ? "Web" : device.platform));
    if (device.kind === "session") deviceMeta.append(badgeNode("Session"));
    deviceCell.append(deviceMeta);
    const profileName = device.profile_id
      ? profileNames.get(device.profile_id) || device.profile_id
      : "—";
    const appCell = document.createElement("td");
    const appBadges = document.createElement("div");
    appBadges.className = "device-meta";
    if (device.app_version) {
      const versionBadge = badgeNode(device.app_version);
      versionBadge.classList.add("device-version-badge");
      appBadges.append(versionBadge);
    }
    if (device.app_version_code)
      appBadges.append(badgeNode(`Build ${device.app_version_code}`));
    if (device.distribution) appBadges.append(badgeNode(device.distribution));
    if (!appBadges.childNodes.length) appBadges.textContent = "—";
    appCell.append(appBadges);
    const statusCell = document.createElement("td");
    statusCell.append(status);
    const profileCell = document.createElement("td");
    profileCell.append(badgeNode(profileName));
    const eventCell = document.createElement("td");
    const eventBadge = badgeNode(formatDeviceEvent(device.event_name));
    eventBadge.classList.add("device-event-badge");
    eventCell.append(eventBadge);
    row.append(
      statusCell,
      deviceCell,
      profileCell,
      appCell,
      eventCell,
      textCell(formatDate(device.last_seen)),
    );
    body.append(row);
  }
}

let presenceRefreshPending = false;
let presenceRefreshFailed = false;
async function refreshVisiblePresence() {
  if (!state.token || document.visibilityState !== "visible" || presenceRefreshPending || state.pendingRequests) return;
  const accountId = !byId("account-view").classList.contains("hidden")
    ? state.selectedAccount?.account.id : null;
  const dashboardVisible = !byId("dashboard-home-view").classList.contains("hidden");
  const accountsVisible = !byId("accounts-view").classList.contains("hidden");
  if (!accountId && !dashboardVisible && !accountsVisible) return;
  presenceRefreshPending = true;
  try {
    if (accountId) {
      const result = await api(`/admin-api/accounts/${encodeURIComponent(accountId)}`);
      if (state.selectedAccount?.account.id === accountId && !byId("account-view").classList.contains("hidden")) {
        renderDeviceBadges(result.account.devices, true);
      }
    } else if (dashboardVisible) {
      const result = await api("/admin-api/overview");
      if (!byId("dashboard-home-view").classList.contains("hidden")) {
        byId("metrics").querySelector('[data-action="online-filter"] .metric-value').textContent = result.online_devices;
      }
    } else if (accountsVisible) {
      await loadAccounts();
    }
    presenceRefreshFailed = false;
  } catch (error) {
    byId("account-devices-body").querySelectorAll(".device-status.online").forEach(status => {
      status.classList.remove("online");
      status.textContent = "Status unbekannt";
    });
    const onlineMetric = byId("metrics").querySelector('[data-action="online-filter"] .metric-value');
    if (onlineMetric) onlineMetric.textContent = "—";
    byId("accounts-body").querySelectorAll("tr").forEach(row => {
      if (row.children[2]) row.children[2].textContent = "—";
    });
    if (!presenceRefreshFailed) showToast(`Live-Status konnte nicht aktualisiert werden: ${error.message}`, true);
    presenceRefreshFailed = true;
  } finally {
    presenceRefreshPending = false;
  }
}
window.setInterval(refreshVisiblePresence, 15_000);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") void refreshVisiblePresence();
});

function badgeNode(label) {
  const badge = document.createElement("span");
  badge.className = "device-badge";
  badge.textContent = label;
  return badge;
}

async function openAccount(accountId) {
  const data = await api(
    `/admin-api/accounts/${encodeURIComponent(accountId)}`,
  );
  state.selectedAccount = data;
  byId("accounts-view").classList.add("hidden");
  byId("global-view").classList.add("hidden");
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

  renderDeviceBadges(data.account.devices || []);

  const stats = byId("account-stats");
  stats.replaceChildren(
    metricNode("sessions", "Gültige Logins", data.account.active_sessions),
    metricNode("history", "Watch History", data.account.watch_history_items),
    metricNode(
      "snapshots",
      "Snapshot aktualisiert",
      formatDate(data.snapshot?.updated_at),
    ),
    metricNode("created", "Erstellt", formatDate(data.account.created_at)),
  );

  const snapshot = data.snapshot;
  byId("snapshot-revision").textContent = snapshot
    ? `Revision ${snapshot.revision}`
    : "Kein Snapshot";
  byId("payload-json").textContent = snapshot
    ? JSON.stringify(snapshot.payload, null, 2)
    : "Kein Cloud-Snapshot vorhanden.";
  byId("payload-json").classList.remove("hidden");
  byId("payload-edit-form").classList.add("hidden");
  byId("edit-payload-button").classList.toggle("hidden", !snapshot);
  renderProfiles(snapshot?.profiles || []);
  byId("mutation-form").classList.toggle("hidden", !snapshot);
  byId("account-config-categories").classList.toggle("hidden", !snapshot);
  if (snapshot) updateOperationFields();
  state.accountAudits.offset = 0;
  await loadAccountAudits(data.account.id);
}

async function deleteProfile(profileId, profileName) {
  const confirmed = await confirmAction({
    title: "Profil löschen",
    message: `Profil "${profileName}" wirklich unwiderruflich löschen?`,
    confirmLabel: "Profil löschen",
    danger: true,
  });
  if (!confirmed) return;
  try {
    await api(
      `/admin-api/accounts/${encodeURIComponent(state.selectedAccount.account.id)}/snapshot`,
      {
        method: "PATCH",
        body: JSON.stringify({
          operation: "delete_profile",
          profileId,
          data: {},
          expectedRevision: state.selectedAccount.snapshot.revision,
        }),
      },
    );
    showToast(`Profil "${profileName}" gelöscht.`);
    await openAccount(state.selectedAccount.account.id);
  } catch (error) {
    showToast(
      error.status === 409
        ? "Der Snapshot wurde inzwischen geändert. Bitte erneut versuchen."
        : error.message,
      true,
    );
    if (error.status === 409)
      await openAccount(state.selectedAccount.account.id);
  }
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
      const badge = document.createElement("span");
      badge.className = "count-badge";
      const number = document.createElement("b");
      number.textContent = value;
      badge.append(number, document.createTextNode(` ${label}`));
      counts.append(badge);
    }
    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "text-button";
    deleteButton.textContent = "Profil löschen";
    if (profiles.length <= 1) {
      deleteButton.disabled = true;
      deleteButton.title = "Das letzte Profil kann nicht gelöscht werden.";
    } else {
      deleteButton.addEventListener("click", () =>
        deleteProfile(profile.id, profile.name),
      );
    }
    row.append(title, id, counts, deleteButton);
    grid.append(row);

    const option = document.createElement("option");
    option.value = profile.id;
    option.textContent = profile.name;
    select.append(option);
  }
}

const operationFields = [
  "upsert_addon",
  "delete_addon",
  "upsert_playlist",
  "delete_playlist",
  "change_streamnet_host",
];

const operationWarnings = {
  upsert_addon:
    "URL einfügen reicht. Das Manifest wird geladen und das Add-on accountweit für alle Profile gespeichert.",
  delete_addon:
    "Das Add-on wird aus allen Profilen entfernt, in denen es installiert ist.",
  upsert_playlist:
    "Diese Änderung gilt nur für das gewählte Profil und erzeugt sofort eine neue Cloud-Revision.",
  delete_playlist: "Die Playlist wird nur aus dem gewählten Profil entfernt.",
  change_streamnet_host:
    "Gilt nur für diesen Account und erzeugt sofort eine neue Cloud-Revision. Ohne Profilauswahl werden alle Profile mit StreamNet TV umgestellt.",
  clear_streamnet_host_override:
    "Entfernt nur das Feld streamNetHostOverride (Zugangsdaten und Optionen bleiben). Die App setzt StreamNet TV danach beim nächsten Laden auf ihren eingebauten Server zurück. Gilt nur für diesen Account; ohne Profilauswahl für alle Profile.",
};

function populateAddonSelect() {
  const select = byId("delete-addon-select");
  select.replaceChildren();
  const addons = state.selectedAccount?.snapshot?.addons || [];
  if (!addons.length) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "Keine Add-ons vorhanden";
    select.append(option);
    select.disabled = true;
    return;
  }
  select.disabled = false;
  for (const addon of addons) {
    const option = document.createElement("option");
    option.value = addon.id;
    option.textContent = addon.name;
    select.append(option);
  }
}

function populatePlaylistSelect() {
  const select = byId("delete-playlist-select");
  select.replaceChildren();
  const profileId = byId("mutation-profile").value;
  const profile = state.selectedAccount?.snapshot?.profiles?.find(
    (candidate) => candidate.id === profileId,
  );
  const playlists = profile?.playlists || [];
  if (!playlists.length) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "Keine Playlists vorhanden";
    select.append(option);
    select.disabled = true;
    return;
  }
  select.disabled = false;
  for (const playlist of playlists) {
    const option = document.createElement("option");
    option.value = playlist.id;
    option.textContent = playlist.enabled
      ? playlist.name
      : `${playlist.name} (deaktiviert)`;
    select.append(option);
  }
}

const accountOperationOptions = [...byId("mutation-operation").options].map(option => option.cloneNode(true));

function selectAccountCategory(category) {
  const select = byId("mutation-operation");
  const previous = select.value;
  const options = accountOperationOptions.filter(option => globalOperationCategory(option.value) === category);
  select.replaceChildren(...options.map(option => option.cloneNode(true)));
  if (options.some(option => option.value === previous)) select.value = previous;
  select.dispatchEvent(new Event("change", { bubbles: true }));
  setMessage(byId("mutation-message"), "");
}

function updateOperationFields() {
  const operation = byId("mutation-operation").value;
  const category = globalOperationCategory(operation);
  document.querySelectorAll("[data-account-category]").forEach(button => {
    button.setAttribute("aria-pressed", String(button.dataset.accountCategory === category));
  });
  byId("account-settings-title").textContent = category === "addons" ? "Add-on-Einstellungen" : "Playlist-Einstellungen";
  byId("account-category-description").textContent = category === "addons"
    ? "Add-ons accountweit für alle Profile verwalten."
    : "Playlists und Server für diesen Account verwalten.";
  byId("account-action-summary").textContent = byId("mutation-operation").selectedOptions[0].textContent.trim();
  byId("account-action-summary").classList.toggle("is-destructive", /^(delete|clear)_/.test(operation));
  byId("account-no-settings").classList.toggle("hidden", operation !== "clear_streamnet_host_override");
  const isProfileScoped =
    operation === "upsert_playlist" || operation === "delete_playlist";
  const isHostChange =
    operation === "change_streamnet_host" ||
    operation === "clear_streamnet_host_override";
  byId("mutation-profile-field").classList.toggle(
    "hidden",
    !isProfileScoped && !isHostChange,
  );
  byId("mutation-profile").required = isProfileScoped;
  // The host change may target all profiles of the account, which the other operations cannot.
  const profileSelect = byId("mutation-profile");
  const allOption = profileSelect.querySelector('option[data-all="true"]');
  if (isHostChange && !allOption) {
    const option = document.createElement("option");
    option.value = "";
    option.dataset.all = "true";
    option.textContent = "Alle Profile";
    profileSelect.prepend(option);
    profileSelect.value = "";
  } else if (!isHostChange && allOption) {
    allOption.remove();
    if (profileSelect.options.length) profileSelect.selectedIndex = 0;
  }
  for (const id of operationFields) {
    const fields = byId(`fields-${id}`);
    fields.classList.toggle("hidden", id !== operation);
    fields.querySelectorAll("input, select").forEach(input => { input.disabled = id !== operation; });
  }
  byId("mutation-warning").textContent = operationWarnings[operation] || "";
  if (operation === "delete_addon") populateAddonSelect();
  if (operation === "delete_playlist") populatePlaylistSelect();
  if (operation === "change_streamnet_host") {
    byId("streamnet-host").value = "";
  }
  if (operation === "upsert_addon") {
    byId("addon-url").value = "";
    byId("addon-enabled").checked = true;
  }
  if (operation === "upsert_playlist") {
    byId("playlist-name").value = "";
    byId("playlist-m3u").value = "";
    byId("playlist-epg").value = "";
    byId("playlist-enabled").checked = true;
    byId("playlist-live").checked = true;
    byId("playlist-vod").checked = true;
    byId("playlist-series").checked = true;
  }
}

function setButtonBusy(button, busy, busyLabel) {
  if (!button) return;
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
  setMessage(message, "Änderung wird geprüft…", "info");
  setButtonBusy(submitButton, true, "Wird gespeichert…");
  try {
    const operation = byId("mutation-operation").value;
    const request = {
      operation,
      reason: byId("mutation-reason").value,
      expectedRevision: state.selectedAccount.snapshot.revision,
    };
    if (operation === "upsert_playlist" || operation === "delete_playlist") {
      request.profileId = byId("mutation-profile").value;
    }
    if (operation === "change_streamnet_host") {
      const profileId = byId("mutation-profile").value;
      if (profileId) request.profileId = profileId;
      request.data = { host: byId("streamnet-host").value.trim() };
    }
    if (operation === "clear_streamnet_host_override") {
      const profileId = byId("mutation-profile").value;
      if (profileId) request.profileId = profileId;
    }
    if (operation === "upsert_addon") {
      normalizeAddonLinkField();
      request.data = {
        url: byId("addon-url").value.trim(),
        isEnabled: byId("addon-enabled").checked,
      };
    } else if (operation === "delete_addon") {
      request.data = { id: byId("delete-addon-select").value };
    } else if (operation === "upsert_playlist") {
      request.data = {
        name: byId("playlist-name").value.trim(),
        m3uUrl: byId("playlist-m3u").value.trim(),
        epgUrl: byId("playlist-epg").value.trim(),
        enabled: byId("playlist-enabled").checked,
        importLiveTv: byId("playlist-live").checked,
        importVod: byId("playlist-vod").checked,
        importSeries: byId("playlist-series").checked,
      };
    } else if (operation === "delete_playlist") {
      request.data = { id: byId("delete-playlist-select").value };
    }
    await saveSnapshotMutation(request, message);
    setMessage(message, "Gespeichert und protokolliert.", "success");
    showToast("Änderung gespeichert.");
    byId("mutation-reason").value = "";
    await openAccount(state.selectedAccount.account.id);
  } catch (error) {
    setMessage(message, error.message, "error");
    showToast(error.message, true);
    if (error.status === 409)
      await openAccount(state.selectedAccount.account.id);
  } finally {
    setButtonBusy(submitButton, false);
  }
}

async function saveSnapshotMutation(request, message) {
  const accountId = state.selectedAccount.account.id;
  const path = `/admin-api/accounts/${encodeURIComponent(accountId)}/snapshot`;
  try {
    return await api(path, { method: "PATCH", body: JSON.stringify(request) });
  } catch (error) {
    if (error.status !== 409) throw error;
    setMessage(
      message,
      "Snapshot wurde parallel geändert. Neue Revision wird geladen und die Änderung wird erneut gespeichert…",
      "info",
    );
    const fresh = await api(
      `/admin-api/accounts/${encodeURIComponent(accountId)}`,
    );
    state.selectedAccount = fresh;
    request.expectedRevision = fresh.snapshot.revision;
    try {
      return await api(path, {
        method: "PATCH",
        body: JSON.stringify(request),
      });
    } catch (retryError) {
      if (retryError.status === 409) {
        retryError.message =
          "Der Snapshot wurde erneut parallel geändert. Bitte die Ansicht prüfen und noch einmal speichern.";
      }
      throw retryError;
    }
  }
}

function renderAuditRows(body, audits, includeAccount) {
  body.replaceChildren();
  for (const audit of audits) {
    const row = document.createElement("tr");
    const cells = [
      formatDate(audit.created_at),
      ...(includeAccount
        ? [audit.account_email || audit.account_id || "Gelöscht"]
        : []),
      formatAuditOperation(audit.operation),
      audit.profile_name || (audit.profile_id ? `Unbekanntes / entferntes Profil · ${audit.profile_id}` : "—"),
      `${audit.revision_before} → ${audit.revision_after}`,
      audit.reason,
    ];
    row.append(...cells.map((value) => textCell(value)));
    body.append(row);
  }
}

async function loadAccountAudits(accountId) {
  const result = await api(
    `/admin-api/audits?account_id=${encodeURIComponent(accountId)}&limit=${state.accountAudits.limit}&offset=${state.accountAudits.offset}`,
  );
  state.accountAudits.total = result.total;
  state.accountAudits.limit = result.limit;
  state.accountAudits.offset = result.offset;
  renderAuditRows(byId("account-audits-body"), result.audits, false);
  byId("account-audits").classList.toggle("hidden", result.audits.length === 0);
  byId("account-audits-empty").classList.toggle(
    "hidden",
    result.audits.length !== 0,
  );
  renderPagination(
    "account-audits-pagination",
    state.accountAudits,
    (offset) => {
      state.accountAudits.offset = offset;
      loadAccountAudits(accountId).catch((error) =>
        showToast(error.message, true),
      );
    },
  );
}

async function loadAudits() {
  const result = await api(
    `/admin-api/audits?limit=${state.audits.limit}&offset=${state.audits.offset}`,
  );
  state.audits.total = result.total;
  state.audits.limit = result.limit;
  state.audits.offset = result.offset;
  const body = byId("audits-body");
  byId("audits-empty").classList.toggle("hidden", result.audits.length !== 0);
  renderAuditRows(body, result.audits, true);
  renderPagination("audits-pagination", state.audits, (offset) => {
    state.audits.offset = offset;
    loadAudits().catch((error) => showToast(error.message, true));
  });
}

const globalOperationOptions = [...byId("global-operation").options].map(option => option.cloneNode(true));

function globalOperationCategory(operation) {
  if (operation.includes("catalog")) return "catalogs";
  if (operation.endsWith("addon") || operation === "clear_addons") return "addons";
  return "playlists";
}

function selectGlobalCategory(category) {
  const select = byId("global-operation");
  const options = globalOperationOptions.filter(option => globalOperationCategory(option.value) === category);
  const previous = select.value;
  select.replaceChildren(...options.map(option => option.cloneNode(true)));
  if (options.some(option => option.value === previous)) select.value = previous;
  select.dispatchEvent(new Event("change", { bubbles: true }));
  setMessage(byId("global-mutation-message"), "");
}

async function loadGlobal() {
  state.global = await api("/admin-api/global");
  byId("global-summary").textContent =
    `${state.global.total} registrierte Accounts · ${state.global.configurable} konfigurierbar · ` +
    `${state.global.skipped} ohne Snapshot/Profile (werden übersprungen)`;
  updateGlobalFields();
}

function updateGlobalFields() {
  const operation = byId("global-operation").value;
  const category = globalOperationCategory(operation);
  const descriptions = {
    playlists: ["Playlist-Einstellungen", "M3U, Xtream und StreamNet TV accountübergreifend verwalten."],
    addons: ["Add-on-Einstellungen", "Add-ons und ihre Zuordnungen zu bestehenden Profilen verwalten."],
    catalogs: ["Katalog-Einstellungen", "Trakt, MDBList, System- und Add-on-Kataloge verwalten."],
  };
  document.querySelectorAll("[data-global-category]").forEach(button => {
    button.setAttribute("aria-pressed", String(button.dataset.globalCategory === category));
  });
  byId("global-settings-title").textContent = descriptions[category][0];
  byId("global-category-description").textContent = descriptions[category][1];
  byId("global-action-summary").textContent = byId("global-operation").selectedOptions[0].textContent;
  byId("global-action-summary").classList.toggle("is-destructive", /^(delete|clear)_/.test(operation));
  const needsTarget = /^(edit|delete|rename|set)_/.test(operation) || operation === "change_xtream_host";
  const editsData = /^(add|edit)_/.test(operation);
  const isAddon = operation.endsWith("addon") || operation === "clear_addons";
  const isCatalog = operation.includes("catalog");
  byId("global-target-field").classList.toggle("hidden", !needsTarget);
  byId("global-target").required = needsTarget;
  byId("global-target").disabled = !needsTarget;
  for (const [kind, active] of [["addon", editsData && isAddon], ["playlist", editsData && !isAddon && !isCatalog]]) {
    const fields = byId(`global-${kind}-fields`);
    fields.classList.toggle("hidden", !active);
    fields.querySelectorAll("input").forEach((input) => { input.disabled = !active; });
  }
  const hostOnly = operation === "change_xtream_host";
  byId("global-no-settings").classList.toggle("hidden",
    editsData || hostOnly || operation === "rename_catalog" || operation === "set_catalog_enabled");
  byId("global-host-fields").classList.toggle("hidden", !hostOnly);
  byId("global-host-url").disabled = !hostOnly;
  byId("global-host-url").required = hostOnly;
  updateGlobalPlaylistFields();
  updateGlobalCatalogFields();
  byId("global-addon-url").required = editsData && isAddon;
  const select = byId("global-target");
  const previous = select.value;
  select.replaceChildren();
  const items = state.global?.[isCatalog ? "catalogs" : isAddon ? "addons" : "playlists"] || [];
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = items.length ? "Eintrag auswählen" : "Keine Einträge vorhanden";
  select.append(placeholder);
  for (const item of items) {
    const option = document.createElement("option");
    option.value = item.id;
    option.textContent = `${item.name} · ${item.accountCount} Account(s) · ${item.id}`;
    select.append(option);
  }
  if (items.some((item) => item.id === previous)) select.value = previous;
}

function updateGlobalCatalogFields() {
  const operation = byId("global-operation").value;
  const adding = operation === "add_catalog";
  const renaming = operation === "rename_catalog";
  const settingEnabled = operation === "set_catalog_enabled";
  byId("global-catalog-fields").classList.toggle("hidden", !adding && !renaming && !settingEnabled);
  const type = byId("global-catalog-type").value;
  const template = type === "PREINSTALLED" || type === "ADDON";
  for (const [id, visible] of [
    ["type", adding], ["template", adding && template], ["url", adding && !template],
    ["title", adding || renaming], ["enabled", adding || settingEnabled],
  ]) {
    byId(`global-catalog-${id}-field`).classList.toggle("hidden", !visible);
    byId(`global-catalog-${id}`).disabled = !visible;
  }
  byId("global-catalog-title").required = renaming || (adding && !template);
  byId("global-catalog-url").required = adding && !template;
  byId("global-catalog-template").required = adding && template;
  const select = byId("global-catalog-template");
  const previous = select.value;
  select.replaceChildren();
  const empty = document.createElement("option");
  empty.value = "";
  empty.textContent = "Vorlage auswählen";
  select.append(empty);
  for (const item of state.global?.catalogs || []) {
    if (item.sourceType !== type) continue;
    const option = document.createElement("option");
    option.value = item.id;
    option.textContent = `${item.name} · ${item.id}`;
    select.append(option);
  }
  if ([...select.options].some((option) => option.value === previous)) select.value = previous;
}

function updateGlobalPlaylistFields() {
  const active = /^(add|edit)_playlist$/.test(byId("global-operation").value);
  const type = byId("global-playlist-type");
  type.disabled = !active;
  const xtream = type.value !== "m3u";
  byId("global-m3u-fields").classList.toggle("hidden", xtream);
  byId("global-xtream-fields").classList.toggle("hidden", !xtream);
  for (const id of ["global-playlist-url", "global-playlist-epg"]) {
    byId(id).disabled = !active || xtream;
  }
  byId("global-playlist-url").required = active && !xtream;
  for (const id of ["global-xtream-host", "global-xtream-user", "global-xtream-password"]) {
    byId(id).disabled = !active || !xtream;
    byId(id).required = active && xtream;
  }
  byId("global-playlist-name").disabled = !active || type.value === "streamnet_tv";
}

async function submitGlobalMutation(event) {
  event.preventDefault();
  const button = event.target.querySelector('button[type="submit"]');
  const message = byId("global-mutation-message");
  setButtonBusy(button, true, "Vorschau wird geladen…");
  try {
    const operation = byId("global-operation").value;
    const operationLabel = byId("global-operation").selectedOptions[0].textContent;
    const request = {
      operation,
      targetId: byId("global-target").value,
      reason: byId("global-reason").value,
    };
    if (operation === "add_catalog") {
      request.data = {
        sourceType: byId("global-catalog-type").value,
        templateId: byId("global-catalog-template").value,
        sourceUrl: byId("global-catalog-url").value.trim(),
        title: byId("global-catalog-title").value.trim(),
        enabled: byId("global-catalog-enabled").checked,
      };
    } else if (operation === "rename_catalog") {
      request.data = { title: byId("global-catalog-title").value.trim() };
    } else if (operation === "set_catalog_enabled") {
      request.data = { enabled: byId("global-catalog-enabled").checked };
    } else if (/^(add|edit)_addon$/.test(operation)) {
      request.data = { url: byId("global-addon-url").value.trim(), isEnabled: byId("global-addon-enabled").checked };
    } else if (/^(add|edit)_playlist$/.test(operation)) {
      request.data = {
        name: byId("global-playlist-name").value.trim(),
        m3uUrl: byId("global-playlist-url").value.trim(),
        epgUrl: byId("global-playlist-epg").value.trim(),
        enabled: byId("global-playlist-enabled").checked,
        importLiveTv: byId("global-playlist-live").checked,
        importVod: byId("global-playlist-vod").checked,
        importSeries: byId("global-playlist-series").checked,
        sourceType: byId("global-playlist-type").value,
      };
      if (request.data.sourceType !== "m3u") {
        request.data.host = byId("global-xtream-host").value.trim();
        request.data.username = byId("global-xtream-user").value.trim();
        request.data.password = byId("global-xtream-password").value.trim();
      }
    } else if (operation === "change_xtream_host") {
      request.data = { host: byId("global-host-url").value.trim() };
    }
    const preview = await api("/admin-api/global/preview", { method: "POST", body: JSON.stringify(request) });
    const counts = (result) =>
      `${result.changed} Account(s) geändert, ${result.unchanged} unverändert, ${result.skipped} ohne Snapshot/Profile übersprungen.`;
    if (!preview.changed) {
      setMessage(message, `Keine Änderungen erforderlich. ${counts(preview)}`, "info");
      return;
    }
    const confirmed = await openAdminDialog({
      title: "Globale Änderung bestätigen",
      eyebrow: "ALLE ACCOUNTS",
      message: `${operationLabel}. ` +
        `${preview.changed} von ${preview.total} Accounts werden geändert; ` +
        `${preview.unchanged} bleiben unverändert, ${preview.skipped} werden übersprungen. ` +
        'Zum Anwenden bitte "ALLE ACCOUNTS" eingeben. Entfernen ist nicht rückgängig zu machen.',
      inputLabel: "Bestätigung",
      requiredText: "ALLE ACCOUNTS",
      requiredTextError: 'Bitte exakt "ALLE ACCOUNTS" eingeben.',
      confirmLabel: "Global anwenden",
      danger: true,
    });
    if (confirmed !== "ALLE ACCOUNTS") {
      setMessage(message, "Globale Änderung abgebrochen.", "info");
      return;
    }
    const result = await api("/admin-api/global/snapshot", {
      method: "PATCH",
      body: JSON.stringify({ ...request, expectedState: preview.state, confirmation: confirmed }),
    });
    setMessage(message, `Gespeichert und pro Account protokolliert. ${counts(result)}`, "success");
    showToast("Globale Änderung gespeichert.");
    await loadGlobal();
  } catch (error) {
    setMessage(message, error.message, "error");
    showToast(error.message, true);
  } finally {
    setButtonBusy(button, false);
  }
}

function selectView(view) {
  document.querySelectorAll(".nav-item").forEach((item) => {
    item.classList.toggle("active", item.dataset.view === view);
  });
  byId("dashboard-header-actions").classList.toggle(
    "hidden",
    view !== "dashboard",
  );
  byId("account-view").classList.add("hidden");
  byId("dashboard-home-view").classList.toggle("hidden", view !== "dashboard");
  byId("accounts-view").classList.toggle("hidden", view !== "accounts");
  byId("global-view").classList.toggle("hidden", view !== "global");
  byId("audits-view").classList.toggle("hidden", view !== "audits");
  byId("page-title").textContent =
    view === "dashboard"
      ? "Dashboard"
      : view === "accounts"
        ? "Accounts"
        : view === "global"
          ? "Remote Config"
          : "Audit-Protokoll";
  const load =
    view === "dashboard"
      ? loadDashboard
      : view === "accounts"
        ? loadAccounts
        : view === "global"
          ? loadGlobal
          : loadAudits;
  load().catch((error) => showToast(error.message, true));
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
        username: byId("login-username").value,
        password: byId("login-password").value,
      }),
    });
    state.token = result.access_token;
    sessionStorage.setItem("streamnet:admin-token", state.token);
    sessionStorage.removeItem("streamnet:admin-username");
    showDashboard();
    selectView("dashboard");
  } catch (error) {
    errorNode.textContent = error.message;
  } finally {
    setButtonBusy(submitButton, false);
  }
});

byId("logout-button").addEventListener("click", logout);
byId("global-operation").addEventListener("change", updateGlobalFields);
document.querySelectorAll("[data-global-category]").forEach(button => {
  button.addEventListener("click", () => selectGlobalCategory(button.dataset.globalCategory));
});
selectGlobalCategory("playlists");
byId("global-playlist-type").addEventListener("change", updateGlobalPlaylistFields);
byId("global-catalog-type").addEventListener("change", updateGlobalCatalogFields);
byId("global-target").addEventListener("change", () => {
  if (byId("global-target").value === "streamnet_tv") {
    byId("global-playlist-type").value = "streamnet_tv";
    byId("global-playlist-type").dispatchEvent(new Event("change"));
  }
});
byId("global-form").addEventListener("submit", submitGlobalMutation);
for (const [id, load] of [
  ["global-refresh", loadGlobal],
  ["dashboard-refresh", loadDashboard],
  ["refresh-button", loadAccounts],
]) {
  byId(id).addEventListener("click", async (event) => {
    const button = event.currentTarget;
    const label = button.querySelector("span");
    button.disabled = true;
    button.classList.add("is-loading");
    button.setAttribute("aria-busy", "true");
    label.textContent = "Aktualisiere...";
    if (id === "refresh-button") state.accounts.offset = 0;
    try {
      await load();
    } catch (error) {
      showToast(error.message, true);
    } finally {
      button.disabled = false;
      button.classList.remove("is-loading");
      button.removeAttribute("aria-busy");
      label.textContent = "Aktualisieren";
    }
  });
}
byId("clear-online-filter").addEventListener("click", () => {
  state.onlineOnly = false;
  state.accounts.offset = 0;
  loadAccounts().catch((error) => showToast(error.message, true));
});
byId("back-button").addEventListener("click", () => selectView("accounts"));
byId("mutation-operation").addEventListener("change", updateOperationFields);
document.querySelectorAll("[data-account-category]").forEach(button => {
  button.addEventListener("click", () => selectAccountCategory(button.dataset.accountCategory));
});
selectAccountCategory("playlists");
byId("addon-url").addEventListener("blur", () => normalizeAddonLinkField());
byId("mutation-profile").addEventListener("change", () => {
  if (byId("mutation-operation").value === "delete_playlist")
    populatePlaylistSelect();
});
byId("mutation-form").addEventListener("submit", submitMutation);
byId("revoke-sessions-button").addEventListener("click", async (event) => {
  const button = event.currentTarget;
  const confirmed = await confirmAction({
    title: "Alle Sitzungen abmelden",
    message:
      "Alle gültigen Logins dieses Accounts werden abgemeldet. Geräte können sich danach erneut anmelden.",
    confirmLabel: "Sitzungen abmelden",
    danger: true,
  });
  if (!confirmed) return;
  setButtonBusy(button, true, "Wird abgemeldet…");
  try {
    const result = await api(
      `/admin-api/accounts/${encodeURIComponent(state.selectedAccount.account.id)}/sessions/revoke-all`,
      { method: "POST", body: JSON.stringify({}) },
    );
    showToast(`${result.revoked_count} Sitzung(en) abgemeldet.`);
    await openAccount(state.selectedAccount.account.id);
  } catch (error) {
    showToast(error.message, true);
  } finally {
    setButtonBusy(button, false);
  }
});
byId("reset-offline-devices-button").addEventListener(
  "click",
  async (event) => {
    const button = event.currentTarget;
    const confirmed = await confirmAction({
      title: "Offline-Verlauf zurücksetzen",
      message:
        "Alle nicht aktuell online gesehenen Geräte werden aus der Gerätehistorie entfernt. Gerade aktive Geräte bleiben erhalten.",
      confirmLabel: "Offline-Verlauf löschen",
      danger: true,
    });
    if (!confirmed) return;
    setButtonBusy(button, true, "Wird zurückgesetzt…");
    try {
      const result = await api(
        `/admin-api/accounts/${encodeURIComponent(state.selectedAccount.account.id)}/devices/offline`,
        { method: "DELETE" },
      );
      showToast(`${result.removed_devices ?? result.removed_events ?? 0} Offline-Gerät(e) entfernt.`);
      await openAccount(state.selectedAccount.account.id);
    } catch (error) {
      showToast(error.message, true);
    } finally {
      setButtonBusy(button, false);
    }
  },
);
byId("cleanup-devices-sessions-button").addEventListener(
  "click",
  async (event) => {
    const button = event.currentTarget;
    const confirmed = await confirmAction({
      title: "Geräte & Sessions bereinigen",
      message:
        "Pro Gerät bleibt nur der neueste Geräte-Event erhalten. Bei gültigen Logins bleibt pro erkennbarem Client die neueste Session aktiv.",
      confirmLabel: "Bereinigen",
      danger: true,
    });
    if (!confirmed) return;
    setButtonBusy(button, true, "Wird bereinigt…");
    try {
      const result = await api(
        `/admin-api/accounts/${encodeURIComponent(state.selectedAccount.account.id)}/devices/cleanup`,
        { method: "POST", body: JSON.stringify({}) },
      );
      showToast(
        `${result.removed_events || 0} alte Geräte-Event(s) entfernt, ${result.revoked_sessions || 0} alte Session(s) widerrufen.`,
      );
      await openAccount(state.selectedAccount.account.id);
    } catch (error) {
      showToast(error.message, true);
    } finally {
      setButtonBusy(button, false);
    }
  },
);
byId("delete-account-button").addEventListener("click", async (event) => {
  const button = event.currentTarget;
  const account = state.selectedAccount.account;
  const typed = await openAdminDialog({
    title: "Konto löschen",
    eyebrow: "GEFÄHRLICH",
    message: `Zum Bestätigen bitte die E-Mail-Adresse "${account.email}" eingeben.`,
    inputLabel: "E-Mail-Adresse",
    requiredText: account.email,
    requiredTextError: "E-Mail-Adresse stimmt nicht überein.",
    confirmLabel: "Weiter",
    danger: true,
  });
  if (typed !== account.email) {
    if (typed !== null) showToast("E-Mail-Adresse stimmt nicht überein.", true);
    return;
  }
  const reason = await promptReason(
    "Warum soll dieses Konto endgültig gelöscht werden?",
    true,
  );
  if (!reason) return;
  setButtonBusy(button, true, "Wird gelöscht…");
  try {
    await api(`/admin-api/accounts/${encodeURIComponent(account.id)}`, {
      method: "DELETE",
      body: JSON.stringify({ reason }),
    });
    showToast(`Konto ${account.email} wurde gelöscht.`);
    selectView("accounts");
  } catch (error) {
    showToast(error.message, true);
  } finally {
    setButtonBusy(button, false);
  }
});
byId("copy-payload").addEventListener("click", async () => {
  await navigator.clipboard.writeText(byId("payload-json").textContent);
  showToast("Maskiertes JSON kopiert.");
});
byId("edit-payload-button").addEventListener("click", () => {
  const snapshot = state.selectedAccount?.snapshot;
  if (!snapshot) return;
  byId("payload-json").classList.add("hidden");
  byId("payload-edit-data").value = JSON.stringify(snapshot.payload, null, 2);
  byId("payload-edit-message").textContent = "";
  byId("payload-edit-message").className = "message";
  byId("payload-edit-form").classList.remove("hidden");
});
byId("payload-edit-cancel").addEventListener("click", () => {
  byId("payload-edit-form").classList.add("hidden");
  byId("payload-json").classList.remove("hidden");
});
byId("payload-edit-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const message = byId("payload-edit-message");
  const submitButton = event.target.querySelector('button[type="submit"]');
  message.className = "message";
  message.textContent = "Änderung wird geprüft…";
  setButtonBusy(submitButton, true, "Wird gespeichert…");
  try {
    let data;
    try {
      data = JSON.parse(byId("payload-edit-data").value);
    } catch {
      throw new Error("Ungültiges JSON.");
    }
    await api(
      `/admin-api/accounts/${encodeURIComponent(state.selectedAccount.account.id)}/snapshot`,
      {
        method: "PATCH",
        body: JSON.stringify({
          operation: "edit_payload",
          data,
          reason: byId("payload-edit-reason").value,
          expectedRevision: state.selectedAccount.snapshot.revision,
        }),
      },
    );
    byId("payload-edit-reason").value = "";
    showToast("Payload gespeichert und protokolliert.");
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
});
byId("clear-audits-button").addEventListener("click", async (event) => {
  const button = event.currentTarget;
  const confirmed = await openAdminDialog({
    title: "Audit-Protokoll leeren",
    eyebrow: "GEFÄHRLICH",
    message:
      'Zum Bestätigen bitte "LEEREN" eingeben. Dadurch werden alle Admin-Audit-Einträge entfernt.',
    inputLabel: "Bestätigung",
    requiredText: "LEEREN",
    requiredTextError: 'Bitte exakt "LEEREN" eingeben.',
    confirmLabel: "Protokoll leeren",
    danger: true,
  });
  if (confirmed !== "LEEREN") return;
  setButtonBusy(button, true, "Wird geleert…");
  try {
    const result = await api("/admin-api/audits", { method: "DELETE" });
    showToast(`${result.deleted_count || 0} Audit-Eintrag/Einträge gelöscht.`);
    state.audits.offset = 0;
    await loadAudits();
  } catch (error) {
    showToast(error.message, true);
  } finally {
    setButtonBusy(button, false);
  }
});
byId("account-search").addEventListener("input", () => {
  window.clearTimeout(state.searchTimer);
  state.accounts.offset = 0;
  state.searchTimer = window.setTimeout(
    () => loadAccounts().catch((error) => showToast(error.message, true)),
    250,
  );
});
document.querySelectorAll(".nav-item").forEach((item) => {
  item.addEventListener("click", () => selectView(item.dataset.view));
});
document.querySelectorAll("select").forEach(enhanceSelect);

if (state.token) {
  showDashboard();
  selectView("dashboard");
}
