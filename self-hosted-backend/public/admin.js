const state = {
  token: sessionStorage.getItem("streamnet:admin-token"),
  adminEmail: sessionStorage.getItem("streamnet:admin-email"),
  selectedAccount: null,
  searchTimer: null,
  pendingRequests: 0,
  accounts: { limit: 10, offset: 0, total: 0 },
  audits: { limit: 10, offset: 0, total: 0 },
  accountAudits: { limit: 10, offset: 0, total: 0 },
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

function shortInstallId(value) {
  const raw = String(value || "");
  if (raw.length <= 12) return raw || "—";
  return `${raw.slice(0, 6)}…${raw.slice(-4)}`;
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
    ["sessions", "Geräte online", metrics.online_devices],
    ["sessions", "Gültige Logins", metrics.active_sessions],
    ["events", "Events · 24 h", metrics.events_24h],
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
      `/admin-api/accounts?q=${encodeURIComponent(byId("account-search").value)}&limit=${state.accounts.limit}&offset=${state.accounts.offset}`,
    ),
  ]);
  state.accounts.total = accountResult.total;
  state.accounts.limit = accountResult.limit;
  state.accounts.offset = accountResult.offset;
  renderMetrics(metrics);
  renderAccounts(accountResult.accounts);
  renderPagination("accounts-pagination", state.accounts, (offset) => {
    state.accounts.offset = offset;
    loadOverview().catch((error) => showToast(error.message, true));
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

function renderDeviceBadges(devices) {
  const container = byId("account-devices");
  const body = byId("account-devices-body");
  body.replaceChildren();
  container.classList.toggle("hidden", devices.length === 0);
  for (const device of devices) {
    const row = document.createElement("tr");
    const status = document.createElement("span");
    status.className = `device-status${device.online ? " online" : ""}`;
    status.textContent = device.online ? "Online" : "Offline";
    const deviceLabel = [
      deviceTypeLabels[device.device_type] || device.device_type || "Unbekannt",
      device.platform,
      shortInstallId(device.install_id),
    ]
      .filter(Boolean)
      .join(" · ");
    const appLabel = [
      device.app_version,
      device.app_version_code ? `(${device.app_version_code})` : "",
      device.distribution,
    ]
      .filter(Boolean)
      .join(" ");
    const statusCell = document.createElement("td");
    statusCell.append(status);
    row.append(
      statusCell,
      textCell(deviceLabel),
      textCell(device.profile_id || "—"),
      textCell(appLabel || "—"),
      textCell(device.event_name || "—"),
      textCell(formatDate(device.last_seen)),
    );
    body.append(row);
  }
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
  if (snapshot) updateOperationFields();
  state.accountAudits.offset = 0;
  await loadAccountAudits(data.account.id);
}

async function deleteProfile(profileId, profileName) {
  const reason = await promptReason(
    `Warum soll das Profil "${profileName}" gelöscht werden?`,
    true,
  );
  if (!reason) return;
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
          reason,
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
];

const operationWarnings = {
  upsert_addon:
    "URL einfügen reicht. Das Manifest wird geladen und das Add-on accountweit für alle Profile gespeichert.",
  delete_addon:
    "Das Add-on wird aus allen Profilen entfernt, in denen es installiert ist.",
  upsert_playlist:
    "Diese Änderung gilt nur für das gewählte Profil und erzeugt sofort eine neue Cloud-Revision.",
  delete_playlist: "Die Playlist wird nur aus dem gewählten Profil entfernt.",
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
    option.textContent = addon.isEnabled
      ? addon.name
      : `${addon.name} (deaktiviert)`;
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

function updateOperationFields() {
  const operation = byId("mutation-operation").value;
  for (const id of operationFields) {
    byId(`fields-${id}`).classList.toggle("hidden", id !== operation);
  }
  byId("mutation-warning").textContent = operationWarnings[operation] || "";
  if (operation === "delete_addon") populateAddonSelect();
  if (operation === "delete_playlist") populatePlaylistSelect();
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
      profileId: byId("mutation-profile").value,
      reason: byId("mutation-reason").value,
      expectedRevision: state.selectedAccount.snapshot.revision,
    };
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
      audit.operation,
      audit.profile_id,
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
  state.accounts.offset = 0;
  loadOverview()
    .catch((error) => showToast(error.message, true))
    .finally(() => setButtonBusy(button, false));
});
byId("back-button").addEventListener("click", () => selectView("accounts"));
byId("mutation-operation").addEventListener("change", updateOperationFields);
byId("addon-url").addEventListener("blur", () => normalizeAddonLinkField());
byId("mutation-profile").addEventListener("change", () => {
  if (byId("mutation-operation").value === "delete_playlist")
    populatePlaylistSelect();
});
byId("mutation-form").addEventListener("submit", submitMutation);
byId("revoke-sessions-button").addEventListener("click", async (event) => {
  const reason = await promptReason(
    "Warum sollen alle gültigen Logins dieses Accounts abgemeldet werden?",
  );
  if (!reason) return;
  const button = event.currentTarget;
  setButtonBusy(button, true, "Wird abgemeldet…");
  try {
    const result = await api(
      `/admin-api/accounts/${encodeURIComponent(state.selectedAccount.account.id)}/sessions/revoke-all`,
      { method: "POST", body: JSON.stringify({ reason }) },
    );
    showToast(`${result.revoked_count} Sitzung(en) abgemeldet.`);
    await openAccount(state.selectedAccount.account.id);
  } catch (error) {
    showToast(error.message, true);
  } finally {
    setButtonBusy(button, false);
  }
});
byId("delete-account-button").addEventListener("click", async (event) => {
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
  const button = event.currentTarget;
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
byId("account-search").addEventListener("input", () => {
  window.clearTimeout(state.searchTimer);
  state.accounts.offset = 0;
  state.searchTimer = window.setTimeout(
    () => loadOverview().catch((error) => showToast(error.message, true)),
    250,
  );
});
document.querySelectorAll(".nav-item").forEach((item) => {
  item.addEventListener("click", () => selectView(item.dataset.view));
});
document.querySelectorAll("select").forEach(enhanceSelect);

if (state.token) {
  showDashboard();
  loadOverview().catch((error) => showToast(error.message, true));
}
