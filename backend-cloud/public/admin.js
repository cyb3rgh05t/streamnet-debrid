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
  setMobileMenuOpen(false);
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

function jsonItemTitle(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "";
  const text = (key) => {
    const item = value[key];
    return typeof item === "string" || typeof item === "number"
      ? String(item).trim()
      : "";
  };
  const primary =
    ["name", "title", "label", "displayName", "id", "key"]
      .map(text)
      .find(Boolean) || "";
  const secondary =
    ["type", "sourceType", "kind", "version"]
      .map(text)
      .find((item) => item && item !== primary) || "";
  return [primary, secondary].filter(Boolean).join(" · ");
}

function jsonContainerSummary(value) {
  if (Array.isArray(value)) {
    return value.length === 1 ? "1 Eintrag" : `${value.length} Einträge`;
  }
  const count = Object.keys(value).length;
  return count === 1 ? "1 Feld" : `${count} Felder`;
}

function jsonSnapshotSections(payload) {
  if (!payload || typeof payload !== "object") return [];
  return Object.entries(payload).map(([key, value]) => ({
    key,
    count:
      value && typeof value === "object" ? Object.keys(value).length : null,
  }));
}

function jsonQueryMatches(key, value, query) {
  const needle = String(query || "").toLowerCase();
  if (!needle) return false;
  if (String(key).toLowerCase().includes(needle)) return true;
  return value === null || typeof value !== "object"
    ? String(value).toLowerCase().includes(needle)
    : false;
}

const snapshotViewer = {
  payload: undefined,
  query: "",
  openDepth: 1,
  raw: false,
  searchTimer: null,
};
const SNAPSHOT_LONG_STRING = 160;

function appendHighlighted(parent, text, query) {
  const needle = query.toLowerCase();
  const haystack = text.toLowerCase();
  let start = 0;
  let index = needle ? haystack.indexOf(needle) : -1;
  while (index !== -1) {
    if (index > start) parent.append(text.slice(start, index));
    const mark = document.createElement("mark");
    mark.textContent = text.slice(index, index + needle.length);
    parent.append(mark);
    start = index + needle.length;
    index = haystack.indexOf(needle, start);
  }
  if (start < text.length) parent.append(text.slice(start));
}

function snapshotKeyLabel(key, isIndex, query) {
  const label = document.createElement("span");
  label.className = isIndex ? "json-key json-index" : "json-key";
  appendHighlighted(label, isIndex ? `[${key}]` : String(key), query);
  return label;
}

function buildSnapshotLeaf(key, value, isIndex, query) {
  const row = document.createElement("div");
  row.className = "json-row";
  const valueNode = document.createElement("span");
  const type = value === null ? "null" : typeof value;
  valueNode.className = `json-value json-${type}`;
  if (value === "[REDACTED]") {
    valueNode.className = "json-value json-redacted";
    valueNode.textContent = "REDACTED";
    valueNode.title = "Wert wird im Admin-Bereich maskiert";
  } else if (type === "string") {
    const full = value;
    const collapsed = full.length > SNAPSHOT_LONG_STRING;
    const render = (expanded) => {
      valueNode.replaceChildren();
      const shown = collapsed && !expanded
        ? `${full.slice(0, SNAPSHOT_LONG_STRING)}…`
        : full;
      valueNode.append('"');
      appendHighlighted(valueNode, shown, query);
      valueNode.append('"');
      if (collapsed) {
        const toggle = document.createElement("button");
        toggle.type = "button";
        toggle.className = "json-more";
        toggle.textContent = expanded ? "weniger" : `mehr (${full.length})`;
        toggle.addEventListener("click", () => render(!expanded));
        valueNode.append(" ", toggle);
      }
    };
    render(false);
  } else {
    appendHighlighted(valueNode, String(value), query);
  }
  row.append(snapshotKeyLabel(key, isIndex, query), ": ", valueNode);
  return row;
}

function buildSnapshotChildren(container, query, stats, depth, path) {
  const fragment = document.createDocumentFragment();
  const isArray = Array.isArray(container);
  for (const [key, value] of Object.entries(container)) {
    const node = buildSnapshotNode(key, value, isArray, query, stats, depth, `${path}/${key}`);
    if (node) fragment.append(node);
  }
  return fragment;
}

function buildSnapshotNode(key, value, isIndex, query, stats, depth, path) {
  const keyMatches = Boolean(query) && String(key).toLowerCase().includes(query.toLowerCase());
  if (value === null || typeof value !== "object") {
    if (query && !jsonQueryMatches(key, value, query)) return null;
    if (query) stats.matches += 1;
    return buildSnapshotLeaf(key, value, isIndex, query);
  }

  const details = document.createElement("details");
  details.className = "json-node";
  details.dataset.path = path;
  const summary = document.createElement("summary");
  summary.append(snapshotKeyLabel(key, isIndex, query));
  const title = isIndex ? jsonItemTitle(value) : "";
  if (title) {
    const titleNode = document.createElement("span");
    titleNode.className = "json-title";
    appendHighlighted(titleNode, title, query);
    summary.append(titleNode);
  }
  const count = document.createElement("span");
  count.className = "json-count";
  count.textContent = jsonContainerSummary(value);
  summary.append(count);
  details.append(summary);

  const body = document.createElement("div");
  body.className = "json-children";
  details.append(body);

  let rendered = false;
  const renderBody = (childQuery) => {
    if (rendered) return;
    rendered = true;
    body.append(buildSnapshotChildren(value, childQuery, stats, depth + 1, path));
  };

  if (query && keyMatches) {
    // The key itself is the hit: keep the branch collapsed and render it on demand.
    stats.matches += 1;
    details.addEventListener("toggle", () => {
      if (details.open) renderBody("");
    });
  } else if (query) {
    // Filtered view: only branches that contain a hit are rendered, already opened.
    renderBody(query);
    if (!body.childElementCount) return null;
    details.open = true;
  } else if (depth < snapshotViewer.openDepth) {
    renderBody("");
    details.open = true;
  } else {
    details.addEventListener("toggle", () => {
      if (details.open) renderBody("");
    });
  }
  return details;
}

function renderSnapshotTree() {
  const tree = byId("snapshot-tree");
  const status = byId("snapshot-search-status");
  const payload = snapshotViewer.payload;
  const query = snapshotViewer.query.trim();
  tree.replaceChildren();
  status.textContent = "";
  if (payload === undefined) {
    const empty = document.createElement("p");
    empty.className = "snapshot-empty";
    empty.textContent = "Kein Cloud-Snapshot vorhanden.";
    tree.append(empty);
    return;
  }
  if (payload === null || typeof payload !== "object") {
    tree.append(buildSnapshotLeaf("snapshot", payload, false, ""));
    return;
  }
  const stats = { matches: 0 };
  tree.append(buildSnapshotChildren(payload, query, stats, 0, ""));
  if (query) {
    status.textContent =
      stats.matches === 0
        ? "Keine Treffer"
        : stats.matches === 1
          ? "1 Treffer"
          : `${stats.matches} Treffer`;
    if (stats.matches === 0) {
      const empty = document.createElement("p");
      empty.className = "snapshot-empty";
      empty.textContent = `Nichts gefunden für „${query}“.`;
      tree.append(empty);
    }
  }
}

function renderSnapshotSections() {
  const nav = byId("snapshot-sections");
  nav.replaceChildren();
  for (const section of jsonSnapshotSections(snapshotViewer.payload)) {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "snapshot-chip";
    chip.append(section.key);
    if (section.count !== null) {
      const badge = document.createElement("span");
      badge.textContent = String(section.count);
      chip.append(badge);
    }
    chip.addEventListener("click", () => jumpToSnapshotSection(section.key));
    nav.append(chip);
  }
  nav.classList.toggle("hidden", nav.childElementCount === 0);
}

function jumpToSnapshotSection(key) {
  if (snapshotViewer.query) {
    snapshotViewer.query = "";
    byId("snapshot-search").value = "";
    renderSnapshotTree();
  }
  const tree = byId("snapshot-tree");
  const node = [...tree.querySelectorAll(":scope > details")].find(
    (item) => item.dataset.path === `/${key}`,
  );
  if (!node) return;
  node.open = true;
  tree.scrollTo({ top: node.offsetTop - tree.offsetTop, behavior: "smooth" });
}

function applySnapshotViewMode() {
  const raw = snapshotViewer.raw;
  byId("payload-json").classList.toggle("hidden", !raw);
  byId("snapshot-tree").classList.toggle("hidden", raw);
  byId("snapshot-sections").classList.toggle(
    "hidden",
    raw || byId("snapshot-sections").childElementCount === 0,
  );
  for (const id of ["snapshot-search", "snapshot-search-status", "snapshot-expand-all", "snapshot-collapse-all"]) {
    byId(id).classList.toggle("hidden", raw);
  }
  byId("snapshot-view-toggle").textContent = raw ? "Baumansicht" : "Rohes JSON";
}

function renderSnapshotViewer(payload) {
  snapshotViewer.payload = payload;
  snapshotViewer.query = "";
  snapshotViewer.openDepth = 1;
  snapshotViewer.raw = false;
  byId("snapshot-search").value = "";
  renderSnapshotSections();
  renderSnapshotTree();
  applySnapshotViewMode();
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
    add_catalog: "Katalog verteilt / aktualisiert",
    rename_catalog: "Katalog-Titel geändert",
    set_catalog_enabled: "Katalog ein- / ausgeblendet",
    delete_catalog: "Katalog gelöscht / ausgeblendet",
    set_catalog_source: "Home-Reihe: MDBList-Liste ausgetauscht",
    set_catalog_slug: "Collection: MDBList-Liste ausgetauscht",
    set_catalog_addon: "Collection: Addon-Quelle ausgetauscht",
    clear_catalog_source: "Ausgetauschte Listen zurückgesetzt",
    remove_obsolete_catalogs: "Veraltete Kataloge bereinigt",
    add_catalog_item: "Franchise: Titel ergänzt",
    remove_catalog_item: "Franchise: Titel entfernt",
    catalog_franchise_save: "Franchise gespeichert",
    catalog_franchise_reset: "Franchise auf eingebaute Listen zurückgesetzt",
    catalog_franchise_delete: "Franchise gelöscht",
    catalog_overrides_save: "Standard-Listen gespeichert",
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
  await Promise.all([loadLiveVersions(), loadDeviceActivity()]);
}

let deviceActivityDays = 7;
let deviceActivityRequest = 0;
async function loadDeviceActivity() {
  const request = ++deviceActivityRequest;
  const token = state.token;
  const chart = byId("device-activity-chart");
  const status = byId("device-activity-status");
  // The previous chart stays until the new data is ready, so a refresh does not collapse the panel.
  if (!chart.hasChildNodes()) status.textContent = "Geräteaktivität wird geladen…";
  try {
    const result = await api(`/admin-api/device-activity?days=${deviceActivityDays}`);
    if (request !== deviceActivityRequest || token !== state.token) return;
    const columns = [];
    const peak = Math.max(1, ...result.days.map(day => day.devices));
    const total = result.days.reduce((sum, day) => sum + day.devices, 0);
    status.textContent = result.demo ? "Demo-Daten · simulierte Geräteaktivität" :
      total === 0 ? "Noch keine Aktivität im gewählten Zeitraum erfasst. Frühere Tage werden nicht nachträglich rekonstruiert." : "";
    chart.style.setProperty("--activity-days", result.days.length);
    result.days.forEach(day => {
      const date = new Date(`${day.date}T00:00:00Z`);
      const label = new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit", timeZone: "UTC" }).format(date);
      const column = document.createElement("div");
      column.className = "device-activity-column";
      column.tabIndex = 0;
      column.title = `${label} (UTC): ${day.devices} aktive Geräte`;
      column.setAttribute("aria-label", column.title);
      const value = document.createElement("span");
      value.className = "device-activity-value";
      value.textContent = day.devices;
      const track = document.createElement("div");
      track.className = "device-activity-track";
      const bar = document.createElement("div");
      bar.className = "device-activity-bar";
      bar.style.height = `${day.devices / peak * 100}%`;
      track.append(bar);
      const caption = document.createElement("span");
      caption.className = "device-activity-date";
      caption.textContent = label;
      column.append(value, track, caption);
      columns.push(column);
    });
    chart.replaceChildren(...columns);
  } catch (error) {
    if (request !== deviceActivityRequest || token !== state.token) return;
    chart.replaceChildren();
    status.textContent = `Geräteaktivität konnte nicht geladen werden: ${error.message}`;
    showToast(error.message, true);
  }
}

document.querySelectorAll("[data-activity-days]").forEach(button => {
  button.addEventListener("click", () => {
    deviceActivityDays = Number(button.dataset.activityDays);
    document.querySelectorAll("[data-activity-days]").forEach(item =>
      item.setAttribute("aria-pressed", String(item === button)));
    loadDeviceActivity();
  });
});

function renderDashboardFacts(id, entries) {
  const container = byId(id);
  container.replaceChildren();
  for (const [label, value] of entries) {
    const row = document.createElement("div");
    const term = document.createElement("dt");
    term.textContent = label;
    const description = document.createElement("dd");
    if (id === "dashboard-system" && ["Admin API", "Datenbank"].includes(label)) {
      if (String(value).startsWith("Erreichbar") || String(value).startsWith("Verbunden")) {
        description.classList.add("dashboard-fact-success");
      }
    }
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
  // Keep the last known versions visible while the check runs; only a first load shows placeholders.
  for (const component of ["web", "android"]) {
    const versionNode = byId(`dashboard-${component}-version`);
    if (!versionNode.textContent.trim()) versionNode.textContent = "—";
    const link = byId(`dashboard-${component}-release`);
    if (!link.getAttribute("href")) {
      link.href = component === "android"
        ? "https://github.com/cyb3rgh05t/streamnet-debrid/releases"
        : "https://github.com/cyb3rgh05t/streamnet-debrid/blob/main/CHANGELOG.md";
    }
  }
  if (!byId("dashboard-web-source").textContent.trim()) byId("dashboard-web-source").textContent = "web.streamnet.live · Wird geprüft...";
  if (!byId("dashboard-android-build").textContent.trim()) byId("dashboard-android-build").textContent = "Veröffentlichtes APK-Release · Wird geprüft...";
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
  renderSnapshotViewer(snapshot ? snapshot.payload : undefined);
  byId("payload-viewer").classList.remove("hidden");
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
  void loadCatalogConfig();
  try {
    state.defaultCatalogs = (await api("/admin-api/global/default-catalogs")).catalogs;
  } catch (error) {
    state.defaultCatalogs = [];
    showToast(`Standard-Kataloge konnten nicht geladen werden: ${error.message}`, true);
  }
  void loadMdblistTitles();
  byId("global-summary").textContent =
    `${state.global.total} registrierte Accounts · ${state.global.configurable} konfigurierbar · ` +
    `${state.global.skipped} ohne Snapshot/Profile (werden übersprungen)`;
  updateGlobalFields();
}

// ---- Remote Config: central catalog configuration (collections, home rows) ----
const rcTabs = ["movie", "series", "timeline"];
const rcNewKey = "__new__";
const rc = { data: null, tab: "overview", ftab: "movie", current: null, drafts: {}, group: "FRANCHISE", src: { tmdb: [], mdblist: [] }, listInfo: {} };
const rcTabHelp = {
  movie: "Filme – eine Zeile pro Titel: movie:ID, optional „| Notiz“. Die App sortiert diesen Tab nach Erscheinungsdatum, jeder Titel nur einmal.",
  series: "Serien – eine Zeile pro Titel: tv:ID, optional „| Notiz“. Die App sortiert diesen Tab nach Erscheinungsdatum, jeder Titel nur einmal.",
  timeline: "Timeline (Filme und Serien gemischt) – eine Zeile pro Eintrag, die Reihenfolge ist die Reihenfolge in der App. Titel dürfen mehrfach vorkommen, z. B. eine Zeile pro Staffel: tv:91363 | What If…? – Staffel 2. Der Text nach | ist der angezeigte Name.",
};
const rcGroupNames = {
  FRANCHISE: "Franchise", SERVICE: "Streamingdienst", DECADE: "Jahrzehnt", MOVIE_GENRE: "Film-Genre", TV_GENRE: "Serien-Genre",
};

function rcEntriesToText(entries) {
  return (entries || []).map((entry) => (entry.title ? `${entry.ref} | ${entry.title}` : entry.ref)).join("\n");
}

function rcTextToEntries(text, tab) {
  const entries = [];
  String(text || "").split(/\r?\n/).forEach((raw, index) => {
    const line = raw.trim();
    if (!line || line.startsWith("#")) return;
    const separator = line.indexOf("|");
    const ref = (separator < 0 ? line : line.slice(0, separator)).trim().toLowerCase();
    const title = separator < 0 ? "" : line.slice(separator + 1).trim();
    if (!/^(movie|tv):\d{1,9}$/.test(ref)) {
      throw new Error(`${tab}, Zeile ${index + 1}: „${line.slice(0, 40)}“ ist kein gültiger Eintrag (movie:ID oder tv:ID)`);
    }
    entries.push(title ? { ref, title } : { ref });
  });
  return entries;
}

function rcLineCount(text) {
  return String(text || "").split(/\r?\n/).filter((line) => line.trim() && !line.trim().startsWith("#")).length;
}

function rcList(text) {
  return String(text || "").split(/[,\s]+/).filter(Boolean);
}

function rcNumberList(text) {
  return rcList(text).map((value) => {
    if (!/^\d{1,9}$/.test(value)) throw new Error(`„${value}“ ist keine gültige TMDB-Collection-ID`);
    return Number(value);
  });
}

function rcElement(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined && text !== null) node.textContent = text;
  if (className) node.className = className;
  return node;
}

function rcStandard(catalogId) {
  return rc.data?.standards.find((item) => item.id === catalogId) ?? null;
}

function rcStandardTitle(catalogId) {
  return rcStandard(catalogId)?.title ?? catalogId;
}

// Everything the form can edit: the app's collections plus the franchises the admin created.
function rcItems() {
  const { standards, franchises } = rc.data;
  const items = standards.filter((item) => item.kind === "COLLECTION").map((standard) => ({
    key: standard.id,
    standard,
    group: standard.group,
    title: standard.title,
    // The three franchises with their own tab lists (Marvel, DC, Star Wars).
    franchise: franchises.find((item) => item.builtin && item.catalogId === standard.id) ?? null,
  }));
  for (const franchise of franchises.filter((item) => !item.builtin)) {
    items.push({ key: `custom:${franchise.id}`, standard: null, group: "FRANCHISE", title: franchise.title, franchise });
  }
  return items;
}

function rcItem(key) {
  return rcItems().find((item) => item.key === key) ?? null;
}

function rcEffective(item) {
  const overrides = rc.data.overrides;
  const standard = item.standard;
  if (!standard) {
    return {
      cover: item.franchise.coverUrl || "", tmdb: item.franchise.tmdbCollections, mdblist: item.franchise.mdblist, extras: [],
    };
  }
  return {
    cover: overrides.covers?.[standard.id] ?? standard.coverUrl,
    tmdb: overrides.sources?.[standard.id]?.tmdbCollections ?? standard.tmdbCollections,
    mdblist: overrides.sources?.[standard.id]?.mdblist ?? standard.mdblist,
    extras: overrides.extras?.[standard.id] ?? [],
  };
}

function rcIsChanged(item) {
  if (!item.standard) return true;
  const { overrides } = rc.data;
  const id = item.standard.id;
  return Boolean(overrides.covers?.[id] || overrides.sources?.[id] || overrides.extras?.[id] || item.franchise?.custom);
}

function selectRcTab(tab) {
  rc.tab = tab;
  document.querySelectorAll("[data-rc-tab]").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.rcTab === tab));
  });
  document.querySelectorAll("[data-rc-panel]").forEach((panel) => {
    panel.classList.toggle("hidden", panel.dataset.rcPanel !== tab);
  });
}

async function loadCatalogConfig() {
  try {
    rc.data = await api("/admin-api/catalog-config");
  } catch (error) {
    showToast(`Zentrale Konfiguration konnte nicht geladen werden: ${error.message}`, true);
    return;
  }
  if (rc.current !== rcNewKey && !rcItem(rc.current)) rc.current = rcItems().find((item) => item.group === rc.group)?.key ?? null;
  renderRcOverview();
  renderRcFranchiseList();
  renderRcFranchiseForm();
  renderRcStandards();
}

function rcMetric(label, value) {
  const item = rcElement("div", null, "metric");
  const body = rcElement("div", null, "metric-body");
  body.append(rcElement("span", label, "metric-label"), rcElement("strong", value, "metric-value"));
  item.append(body);
  return item;
}

function rcEditButton(key) {
  const action = document.createElement("button");
  action.type = "button";
  action.className = "button secondary";
  action.textContent = "Bearbeiten";
  action.addEventListener("click", () => {
    const item = rcItem(key);
    stashRcDraft();
    rc.group = item?.group ?? rc.group;
    byId("rc-group-filter").value = rc.group;
    rc.current = key;
    renderRcFranchiseList();
    renderRcFranchiseForm();
    selectRcTab("franchises");
  });
  const cell = document.createElement("td");
  cell.append(action);
  return cell;
}

function renderRcOverview() {
  const { franchises, overrides } = rc.data;
  const custom = franchises.filter((item) => !item.builtin);
  const changedLists = franchises.filter((item) => item.builtin && item.custom);
  const count = (map) => Object.keys(map || {}).length;
  byId("rc-metrics").replaceChildren(
    rcMetric("Eigene Franchises", custom.length),
    rcMetric("Geänderte Franchise-Listen", changedLists.length),
    rcMetric("Eigene Cover", count(overrides.covers)),
    rcMetric("Ersetzte Quellen", count(overrides.sources)),
    rcMetric("Zusätzliche Titel", Object.values(overrides.extras || {}).reduce((sum, refs) => sum + refs.length, 0)),
    rcMetric("Home-Reihen geändert", count(overrides.rows) + (overrides.hidden || []).length + (overrides.newRows || []).length),
    rcMetric("Letzte Änderung", rc.data.updatedAt ? formatDate(rc.data.updatedAt) : "—"),
  );

  const listed = franchises.filter((item) => !item.builtin || item.custom);
  byId("rc-franchise-rows").replaceChildren(...(listed.length ? listed.map((item) => {
    const row = document.createElement("tr");
    const sources = [
      item.tmdbCollections.length ? `${item.tmdbCollections.length} TMDB` : null,
      item.mdblist.length ? `${item.mdblist.length} MDBList` : null,
    ].filter(Boolean).join(" · ");
    row.append(
      textCell(item.title),
      textCell(item.builtin ? "Eingebaut · geändert" : "Eigene"),
      textCell(item.tabs.movie.length),
      textCell(item.tabs.series.length),
      textCell(item.tabs.timeline.length),
      textCell(sources || "—"),
      textCell(item.updatedAt ? formatDate(item.updatedAt) : "—"),
      rcEditButton(item.builtin ? item.catalogId : `custom:${item.id}`),
    );
    return row;
  }) : [(() => {
    const row = document.createElement("tr");
    const cell = textCell("Keine eigenen oder geänderten Franchise-Listen – es gelten die Listen der App.");
    cell.colSpan = 8;
    row.append(cell);
    return row;
  })()]));

  const rows = [];
  for (const [catalogId, url] of Object.entries(overrides.rows || {})) rows.push([rcStandardTitle(catalogId), "Home-Reihe", url, null]);
  for (const catalogId of overrides.hidden || []) rows.push([rcStandardTitle(catalogId), "Home-Reihe", "Für alle ausgeblendet", null]);
  for (const row of overrides.newRows || []) rows.push([row.title, "Eigene Home-Reihe", row.url, null]);
  for (const [catalogId, url] of Object.entries(overrides.covers || {})) rows.push([rcStandardTitle(catalogId), "Cover", url, catalogId]);
  for (const [catalogId, value] of Object.entries(overrides.sources || {})) {
    const parts = [
      value.tmdbCollections ? `TMDB ${value.tmdbCollections.join(", ")}` : null,
      value.mdblist ? `MDBList ${value.mdblist.join(", ")}` : null,
    ].filter(Boolean);
    rows.push([rcStandardTitle(catalogId), "Quellen", parts.join(" · "), catalogId]);
  }
  for (const [catalogId, refs] of Object.entries(overrides.extras || {})) {
    rows.push([rcStandardTitle(catalogId), "Zusätzliche Titel", `${refs.length}: ${refs.join(", ")}`, catalogId]);
  }
  byId("rc-override-rows").replaceChildren(...(rows.length ? rows.map(([title, kind, value, key]) => {
    const row = document.createElement("tr");
    row.append(textCell(title), textCell(kind), textCell(value));
    if (key) row.append(rcEditButton(key));
    return row;
  }) : [(() => {
    const row = document.createElement("tr");
    const cell = textCell("Keine Abweichungen – es gelten die Standards der App.");
    cell.colSpan = 4;
    row.append(cell);
    return row;
  })()]));
}

function renderRcFranchiseList() {
  const container = byId("rc-franchise-items");
  const items = rcItems().filter((item) => item.group === rc.group);
  container.replaceChildren(...items.map((item) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "rc-franchise-item";
    button.setAttribute("aria-pressed", String(rc.current === item.key));
    const note = item.standard ? (rcIsChanged(item) ? "geändert" : "Standard") : "Eigene";
    button.append(rcElement("strong", item.title), rcElement("small", note));
    button.addEventListener("click", () => {
      stashRcDraft();
      rc.current = item.key;
      renderRcFranchiseList();
      renderRcFranchiseForm();
    });
    return button;
  }));
  byId("rc-new-franchise").classList.toggle("is-active", rc.current === rcNewKey);
}

function stashRcDraft() {
  const key = rc.current;
  if (!key || byId("rc-franchise-form").classList.contains("hidden")) return;
  const draft = rc.drafts[key] ?? { tabs: {} };
  draft.title = byId("rc-f-title").value;
  draft.id = byId("rc-f-id").value;
  draft.cover = byId("rc-f-cover").value;
  draft.tmdb = [...rc.src.tmdb];
  draft.mdblist = [...rc.src.mdblist];
  draft.extras = byId("rc-f-extras").value;
  if (!byId("rc-f-tabs").classList.contains("hidden")) draft.tabs[rc.ftab] = byId("rc-f-text").value;
  draft.reason = byId("rc-f-reason").value;
  rc.drafts[key] = draft;
}

// "user/liste" from a pasted MDBList link or slug; empty when it is neither.
function rcNormalizeSlug(value) {
  const slug = String(value || "").trim().replace(/^https?:\/\/(www\.)?mdblist\.com\/lists\//i, "").replace(/\/+(json)?$/, "");
  return /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(slug) ? slug : "";
}

function rcListBadge(info) {
  if (!info || info.total === null) return ["Typ unbekannt", ""];
  if (info.movies && info.shows) return ["Filme + Serien", "is-movie"];
  if (info.shows) return ["Serien", "is-show"];
  if (info.movies) return ["Filme", "is-movie"];
  return ["leer", ""];
}

function rcListInfoText(info) {
  if (!info) return "Wird geladen…";
  const name = info.title ? `${info.title} · ` : "";
  if (info.total === null) return `${name}Inhalt konnte nicht gelesen werden`;
  return `${name}${info.movies} Filme, ${info.shows} Serien`;
}

async function loadRcListInfo(slugs) {
  const missing = slugs.filter((slug) => !(slug in rc.listInfo));
  if (!missing.length) return;
  try {
    const result = await api(`/admin-api/catalog-config/list-info?slugs=${encodeURIComponent(missing.join(","))}`);
    Object.assign(rc.listInfo, result.lists);
  } catch {
    for (const slug of missing) rc.listInfo[slug] = { title: null, movies: null, shows: null, total: null };
  }
  renderRcSourceRows();
}

function rcSourceRow(badgeText, badgeClass, value, placeholder, infoText, onChange, onRemove) {
  const row = rcElement("div", null, "rc-source-row");
  const input = document.createElement("input");
  input.value = value;
  input.placeholder = placeholder;
  input.autocomplete = "off";
  input.addEventListener("change", () => onChange(input.value));
  const remove = document.createElement("button");
  remove.type = "button";
  remove.className = "button secondary";
  remove.textContent = "Entfernen";
  remove.addEventListener("click", onRemove);
  row.append(rcElement("span", badgeText, `rc-badge ${badgeClass}`.trim()), input, rcElement("span", infoText, "rc-source-info"), remove);
  return row;
}

function renderRcSourceRows() {
  byId("rc-f-tmdb-rows").replaceChildren(...rc.src.tmdb.map((id, index) => rcSourceRow(
    "Film", "is-movie", id, "TMDB-Collection-ID", "TMDB-Collection (enthält nur Filme)",
    (value) => {
      const clean = String(value).trim();
      if (!/^\d{1,9}$/.test(clean)) { showToast("TMDB-Collection-ID: nur Ziffern", true); renderRcSourceRows(); return; }
      rc.src.tmdb[index] = clean;
      renderRcSourceRows();
    },
    () => { rc.src.tmdb.splice(index, 1); renderRcSourceRows(); },
  )));
  byId("rc-f-mdblist-rows").replaceChildren(...rc.src.mdblist.map((slug, index) => {
    const [badge, badgeClass] = rcListBadge(rc.listInfo[slug]);
    return rcSourceRow(
      badge, badgeClass, slug, "user/liste", rcListInfoText(rc.listInfo[slug]),
      (value) => {
        const clean = rcNormalizeSlug(value);
        if (!clean) { showToast("MDBList: user/liste oder ein mdblist.com-Link", true); renderRcSourceRows(); return; }
        rc.src.mdblist[index] = clean;
        renderRcSourceRows();
        void loadRcListInfo([clean]);
      },
      () => { rc.src.mdblist.splice(index, 1); renderRcSourceRows(); },
    );
  }));
  void loadRcListInfo(rc.src.mdblist.filter((slug) => !(slug in rc.listInfo)));
  updateRcComposition();
}

// Titles the app itself ships in the collection ("curated@:tv:224377" in the standards), by type.
function rcBuiltinTitles(standard) {
  const refs = { movie: [], tv: [] };
  for (const source of standard?.sources ?? []) {
    const match = /^curated@(movie|series|timeline)?:(.*)$/.exec(source);
    if (!match || match[1]) continue;
    for (const ref of match[2].split(",")) {
      if (ref.startsWith("movie:")) refs.movie.push(ref);
      else if (ref.startsWith("tv:")) refs.tv.push(ref);
    }
  }
  return refs;
}

// What the Movies and Series tab of the collection contain, from the values currently in the form.
function updateRcComposition() {
  const box = byId("rc-f-composition");
  const key = rc.current;
  const isNew = key === rcNewKey;
  const item = isNew ? null : rcItem(key);
  if (!isNew && !item) { box.replaceChildren(); return; }
  const parts = { movie: [], series: [] };
  const franchise = item?.franchise ?? null;
  if (franchise) {
    const draft = rc.drafts[key]?.tabs ?? {};
    const count = (tab) => (draft[tab] !== undefined ? rcLineCount(draft[tab]) : franchise.tabs[tab].length);
    if (count("movie")) parts.movie.push(`eigene Liste: ${count("movie")} Filme`);
    if (count("series")) parts.series.push(`eigene Liste: ${count("series")} Serien`);
  }
  if (rc.src.tmdb.length) parts.movie.push(`TMDB-Collections ${rc.src.tmdb.join(", ")} (Filme)`);
  for (const slug of rc.src.mdblist) {
    const info = rc.listInfo[slug];
    const name = info?.title || slug;
    if (!info || info.total === null) { parts.movie.push(`${name} (Typ unbekannt)`); parts.series.push(`${name} (Typ unbekannt)`); continue; }
    if (info.movies) parts.movie.push(`${name}: ${info.movies} Filme`);
    if (info.shows) parts.series.push(`${name}: ${info.shows} Serien`);
  }
  const built = rcBuiltinTitles(item?.standard);
  if (built.movie.length) parts.movie.push(`fest in der App: ${built.movie.join(", ")}`);
  if (built.tv.length) parts.series.push(`fest in der App: ${built.tv.join(", ")} (Serie)`);
  const extras = rcList(String(byId("rc-f-extras").value).replace(/\n/g, " ")).map((ref) => ref.toLowerCase());
  const extraMovies = extras.filter((ref) => /^movie:\d+$/.test(ref));
  const extraShows = extras.filter((ref) => /^tv:\d+$/.test(ref));
  if (extraMovies.length) parts.movie.push(`zusätzlich: ${extraMovies.join(", ")}`);
  if (extraShows.length) parts.series.push(`zusätzlich: ${extraShows.join(", ")}`);
  const line = (label, list) => {
    const row = rcElement("div");
    row.append(rcElement("strong", `${label}: `), rcElement("span", list.length ? list.join(" · ") : "nichts", list.length ? "" : "rc-composition-empty"));
    return row;
  };
  const rows = [line("Filme-Tab", parts.movie), line("Serien-Tab", parts.series)];
  if (franchise && (franchise.tabs.timeline.length || rc.drafts[key]?.tabs?.timeline)) {
    const timeline = rc.drafts[key]?.tabs?.timeline !== undefined ? rcLineCount(rc.drafts[key].tabs.timeline) : franchise.tabs.timeline.length;
    rows.push(line("Timeline-Tab", [`${timeline} Einträge`]));
  }
  box.replaceChildren(...rows);
}

function addRcTmdb() {
  const input = byId("rc-f-tmdb-add");
  const value = input.value.trim();
  if (!/^\d{1,9}$/.test(value)) { showToast("TMDB-Collection-ID: nur Ziffern", true); return; }
  if (!rc.src.tmdb.includes(value)) rc.src.tmdb.push(value);
  input.value = "";
  renderRcSourceRows();
}

function addRcMdblist() {
  const input = byId("rc-f-mdblist-add");
  const slug = rcNormalizeSlug(input.value);
  if (!slug) { showToast("MDBList: user/liste oder ein mdblist.com-Link", true); return; }
  if (!rc.src.mdblist.includes(slug)) rc.src.mdblist.push(slug);
  input.value = "";
  renderRcSourceRows();
}

function updateRcExtrasSummary() {
  updateRcComposition();
  const refs = rcList(String(byId("rc-f-extras").value).replace(/\n/g, " "));
  const movies = refs.filter((ref) => /^movie:\d+$/i.test(ref)).length;
  const shows = refs.filter((ref) => /^tv:\d+$/i.test(ref)).length;
  const invalid = refs.length - movies - shows;
  byId("rc-f-extras-summary").textContent = refs.length
    ? `${movies} Filme (movie:), ${shows} Serien (tv:)${invalid ? `, ${invalid} ungültig` : ""}`
    : "movie:ID = Film, tv:ID = Serie";
}

function rcHint(node, label, value) {
  node.textContent = `Standard${label ? ` ${label}` : ""}: ${value || "—"}`;
}

function renderRcFranchiseForm() {
  const key = rc.current;
  const isNew = key === rcNewKey;
  const item = isNew ? null : rcItem(key);
  const form = byId("rc-franchise-form");
  form.classList.toggle("hidden", !isNew && !item);
  if (!isNew && !item) return;
  const standard = item?.standard ?? null;
  const franchise = item?.franchise ?? null;
  const custom = isNew || !standard;
  const isFranchiseGroup = isNew || item.group === "FRANCHISE";
  const hasTabs = isNew || Boolean(franchise);
  const draft = rc.drafts[key] ?? { tabs: {} };
  const effective = item ? rcEffective(item) : { cover: "", tmdb: [], mdblist: [], extras: [] };

  byId("rc-f-heading").textContent = isNew ? "Neue Franchise" : item.title;
  byId("rc-f-title").value = draft.title ?? item?.title ?? "";
  byId("rc-f-id").value = draft.id ?? franchise?.id ?? "";
  byId("rc-f-cover").value = draft.cover ?? effective.cover;
  rc.src = { tmdb: [...(draft.tmdb ?? effective.tmdb)], mdblist: [...(draft.mdblist ?? effective.mdblist)] };
  byId("rc-f-extras").value = draft.extras ?? effective.extras.join("\n");
  renderRcSourceRows();
  updateRcExtrasSummary();
  byId("rc-f-reason").value = draft.reason ?? "";
  byId("rc-f-title").disabled = !custom;
  byId("rc-f-id").disabled = !isNew;
  byId("rc-f-id").closest("label").classList.toggle("hidden", !custom);
  byId("rc-f-tmdb-field").classList.toggle("hidden", !isFranchiseGroup);
  byId("rc-f-tmdb-hint").classList.toggle("hidden", !isFranchiseGroup);
  byId("rc-f-extras-field").classList.toggle("hidden", !(isFranchiseGroup && standard));
  byId("rc-f-tabs").classList.toggle("hidden", !hasTabs);

  if (standard) {
    rcHint(byId("rc-f-cover-hint"), "", standard.coverUrl);
    rcHint(byId("rc-f-tmdb-hint"), "", standard.tmdbCollections.join(", "));
    rcHint(byId("rc-f-mdblist-hint"), "", standard.mdblist.join(", "));
    const other = standard.sources.filter((source) => !/^(mdblist|tmdbCollection):/.test(source) && !source.startsWith("curated@"));
    byId("rc-f-other").textContent = other.length
      ? `Weitere feste Quellen der App (nicht änderbar): ${other.join(" · ")}`
      : "";
  } else {
    byId("rc-f-cover-hint").textContent = "Ohne Cover erscheint die Collection ohne Bild.";
    byId("rc-f-tmdb-hint").textContent = "";
    byId("rc-f-mdblist-hint").textContent = "";
    byId("rc-f-other").textContent = "";
  }
  const preview = byId("rc-f-cover-preview");
  const coverValue = byId("rc-f-cover").value.trim();
  preview.classList.toggle("hidden", !/^https:\/\//.test(coverValue));
  if (/^https:\/\//.test(coverValue)) preview.src = coverValue;

  if (hasTabs) {
    byId("rc-f-text").value = draft.tabs[rc.ftab] ?? rcEntriesToText(franchise?.tabs[rc.ftab]);
    byId("rc-f-tab-help").textContent = rcTabHelp[rc.ftab];
    byId("rc-f-count").textContent = `${rcLineCount(byId("rc-f-text").value)} Einträge in diesem Tab`;
  }
  const changed = item ? rcIsChanged(item) : false;
  byId("rc-f-state").textContent = isNew
    ? "Wird nach dem Speichern für alle Geräte als Collection in der Franchise-Reihe angezeigt."
    : standard
      ? (changed ? "Mit Änderungen gegenüber dem Standard der App." : "Standard der App (noch nicht geändert).")
      : `Eigene Franchise (Stand ${franchise.revision}, gespeichert ${formatDate(franchise.updatedAt)}).`;
  byId("rc-f-reset").classList.toggle("hidden", !standard);
  byId("rc-f-reset").disabled = !changed;
  byId("rc-f-delete").classList.toggle("hidden", isNew || Boolean(standard));
  document.querySelectorAll("[data-rc-ftab]").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.rcFtab === rc.ftab));
  });
  setMessage(byId("rc-f-message"), "");
}

function rcTabsFromDraft(draft, franchise) {
  const tabs = {};
  for (const tab of rcTabs) {
    tabs[tab] = draft.tabs[tab] === undefined ? (franchise?.tabs[tab] ?? []) : rcTextToEntries(draft.tabs[tab], tab);
  }
  return tabs;
}

async function saveRcFranchise(event) {
  event.preventDefault();
  const message = byId("rc-f-message");
  stashRcDraft();
  const key = rc.current;
  const isNew = key === rcNewKey;
  const item = isNew ? null : rcItem(key);
  const draft = rc.drafts[key] ?? { tabs: {} };
  const reason = byId("rc-f-reason").value;
  try {
    const cover = String(draft.cover ?? "").trim();
    const mdblist = (draft.mdblist ?? []).map(rcNormalizeSlug).filter(Boolean);
    const tmdbIds = rcNumberList((draft.tmdb ?? []).join(","));
    if (!item?.standard) {
      const id = isNew ? String(draft.id || "").trim().toLowerCase() : item.franchise.id;
      setMessage(message, "Wird gespeichert…", "info");
      const saved = (await api(`/admin-api/catalog-config/franchises/${encodeURIComponent(id)}`, {
        method: "PUT",
        body: JSON.stringify({
          title: String(draft.title ?? "").trim(), coverUrl: cover, tmdbCollections: tmdbIds,
          mdblist, tabs: rcTabsFromDraft(draft, item?.franchise), reason,
        }),
      })).franchise;
      delete rc.drafts[key];
      rc.current = `custom:${saved.id}`;
    } else {
      const standard = item.standard;
      const overrides = structuredClone(rc.data.overrides);
      for (const name of ["covers", "sources", "extras", "rows"]) overrides[name] ??= {};
      if (cover) overrides.covers[standard.id] = cover; else delete overrides.covers[standard.id];
      const sources = {};
      if (mdblist.length) sources.mdblist = mdblist;
      if (item.group === "FRANCHISE") {
        if (tmdbIds.length) sources.tmdbCollections = tmdbIds;
        const extras = rcList(String(draft.extras ?? "").replace(/\n/g, " ")).map((ref) => ref.toLowerCase());
        if (extras.length) overrides.extras[standard.id] = extras; else delete overrides.extras[standard.id];
      }
      if (Object.keys(sources).length) overrides.sources[standard.id] = sources; else delete overrides.sources[standard.id];
      setMessage(message, "Wird gespeichert…", "info");
      if (item.franchise && Object.keys(draft.tabs).length) {
        await api(`/admin-api/catalog-config/franchises/${encodeURIComponent(item.franchise.id)}`, {
          method: "PUT", body: JSON.stringify({ tabs: rcTabsFromDraft(draft, item.franchise), reason }),
        });
      }
      await api("/admin-api/catalog-config/overrides", { method: "PUT", body: JSON.stringify({ ...overrides, reason }) });
      delete rc.drafts[key];
    }
    await loadCatalogConfig();
    setMessage(byId("rc-f-message"), "Gespeichert und protokolliert. Die Geräte laden die Änderung innerhalb von ca. 15 Minuten.", "success");
  } catch (error) {
    setMessage(message, error.message, "error");
  }
}

async function removeRcFranchise() {
  const item = rcItem(rc.current);
  if (!item) return;
  const reason = byId("rc-f-reason").value;
  const text = item.standard
    ? `„${item.title}“ auf den Standard der App zurücksetzen? Deine Änderungen gehen verloren.`
    : `„${item.title}“ löschen? Die Collection verschwindet aus allen Apps.`;
  if (!window.confirm(text)) return;
  const message = byId("rc-f-message");
  try {
    if (item.standard) {
      const overrides = structuredClone(rc.data.overrides);
      for (const name of ["covers", "sources", "extras"]) delete overrides[name]?.[item.standard.id];
      await api("/admin-api/catalog-config/overrides", { method: "PUT", body: JSON.stringify({ ...overrides, reason }) });
      if (item.franchise?.custom) {
        await api(`/admin-api/catalog-config/franchises/${encodeURIComponent(item.franchise.id)}`, {
          method: "DELETE", body: JSON.stringify({ reason }),
        });
      }
    } else {
      await api(`/admin-api/catalog-config/franchises/${encodeURIComponent(item.franchise.id)}`, {
        method: "DELETE", body: JSON.stringify({ reason }),
      });
      rc.current = null;
    }
    delete rc.drafts[item.key];
    await loadCatalogConfig();
    setMessage(byId("rc-f-message"), item.standard ? "Zurückgesetzt und protokolliert." : "Gelöscht und protokolliert.", "success");
  } catch (error) {
    setMessage(message, error.message, "error");
  }
}

function rcRowIdFor(title) {
  return String(title).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
}

function renderRcStandards() {
  const { standards, overrides } = rc.data;
  rc.newRows = (overrides.newRows || []).map((row) => ({ ...row }));
  const rows = standards.filter((item) => item.kind === "STANDARD" || item.kind === "COLLECTION_RAIL");
  const hidden = new Set(overrides.hidden || []);
  byId("rc-rows").replaceChildren(...rows.map((item) => {
    const line = document.createElement("div");
    line.className = "rc-list-row";
    const text = rcElement("label", null, "rc-list-label rc-row-check");
    const check = document.createElement("input");
    check.type = "checkbox";
    check.checked = !hidden.has(item.id);
    check.dataset.rcShow = item.id;
    const names = rcElement("span");
    names.append(
      rcElement("strong", item.title),
      rcElement("small", item.kind === "COLLECTION_RAIL" ? "Reihe mit Collections" : (item.sourceUrl ? `Standard: ${item.sourceUrl}` : "Reihe der App")),
    );
    text.append(check, names);
    line.append(text);
    if (item.kind === "STANDARD" && String(item.sourceUrl).includes("mdblist.com/lists/")) {
      const input = document.createElement("input");
      input.value = overrides.rows?.[item.id] ?? item.sourceUrl;
      input.placeholder = item.sourceUrl;
      input.autocomplete = "off";
      input.maxLength = 300;
      input.dataset.rcRow = item.id;
      input.dataset.rcDefault = item.sourceUrl;
      line.append(input);
    } else {
      line.append(rcElement("span", "", "rc-source-info"));
    }
    return line;
  }));
  renderRcNewRows();
  byId("rc-nr-after").replaceChildren(
    new Option("Am Ende", ""),
    ...rows.filter((item) => item.kind === "STANDARD").map((item) => new Option(`nach „${item.title}“`, item.id)),
  );
}

function renderRcNewRows() {
  byId("rc-newrows").replaceChildren(...rc.newRows.map((row, index) => {
    const slug = rcNormalizeSlug(row.url);
    const [badge, badgeClass] = rcListBadge(rc.listInfo[slug]);
    const line = rcElement("div", null, "rc-newrow");
    const title = document.createElement("input");
    title.value = row.title;
    title.maxLength = 60;
    title.addEventListener("change", () => { row.title = title.value.trim(); });
    const url = document.createElement("input");
    url.value = row.url;
    url.addEventListener("change", () => {
      const clean = rcNormalizeSlug(url.value);
      if (!clean) { showToast("MDBList: user/liste oder ein mdblist.com-Link", true); renderRcNewRows(); return; }
      row.url = `https://mdblist.com/lists/${clean}`;
      renderRcNewRows();
    });
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "button secondary";
    remove.textContent = "Entfernen";
    remove.addEventListener("click", () => { rc.newRows.splice(index, 1); renderRcNewRows(); });
    const anchor = rcStandard(row.after)?.title ?? rc.newRows.find((other) => other.id === row.after)?.title;
    const position = row.after && anchor ? `nach ${anchor}` : "am Ende";
    line.append(
      rcElement("span", badge, `rc-badge ${badgeClass}`.trim()), title, url,
      rcElement("span", `${rcListInfoText(rc.listInfo[slug])} · ${position}`, "rc-source-info"), remove,
    );
    return line;
  }));
  void loadRcListInfo(rc.newRows.map((row) => rcNormalizeSlug(row.url)).filter(Boolean).filter((slug) => !(slug in rc.listInfo)));
}

function addRcNewRow() {
  const title = byId("rc-nr-title").value.trim();
  const slug = rcNormalizeSlug(byId("rc-nr-url").value);
  if (title.length < 2) { showToast("Titel: mindestens 2 Zeichen", true); return; }
  if (!slug) { showToast("MDBList: user/liste oder ein mdblist.com-Link", true); return; }
  let id = rcRowIdFor(title);
  if (id.length < 3) id = `${id}-reihe`.replace(/^-/, "");
  const base = id;
  for (let n = 2; rc.newRows.some((row) => row.id === id); n += 1) id = `${base}-${n}`;
  rc.newRows.push({ id, title, url: `https://mdblist.com/lists/${slug}`, mediaType: byId("rc-nr-type").value, after: byId("rc-nr-after").value });
  for (const field of ["rc-nr-title", "rc-nr-url"]) byId(field).value = "";
  renderRcNewRows();
}

async function saveRcStandards(event) {
  event.preventDefault();
  const message = byId("rc-s-message");
  try {
    const rows = {};
    document.querySelectorAll("[data-rc-row]").forEach((input) => {
      const value = input.value.trim();
      if (value && value !== input.dataset.rcDefault) rows[input.dataset.rcRow] = value;
    });
    const hidden = [...document.querySelectorAll("[data-rc-show]")].filter((box) => !box.checked).map((box) => box.dataset.rcShow);
    const newRows = rc.newRows.map((row) => ({ id: row.id, title: row.title, url: row.url, mediaType: row.mediaType || "", after: row.after || "" }));
    setMessage(message, "Wird gespeichert…", "info");
    await api("/admin-api/catalog-config/overrides", {
      method: "PUT",
      body: JSON.stringify({ ...rc.data.overrides, rows, hidden, newRows, reason: byId("rc-s-reason").value }),
    });
    await loadCatalogConfig();
    setMessage(byId("rc-s-message"), "Gespeichert und protokolliert. Die Geräte laden die Änderung innerhalb von ca. 15 Minuten.", "success");
  } catch (error) {
    setMessage(message, error.message, "error");
  }
}

document.querySelectorAll("[data-rc-tab]").forEach((button) => {
  button.addEventListener("click", () => selectRcTab(button.dataset.rcTab));
});
document.querySelectorAll("[data-rc-ftab]").forEach((button) => {
  button.addEventListener("click", () => {
    stashRcDraft();
    rc.ftab = button.dataset.rcFtab;
    renderRcFranchiseForm();
  });
});
byId("rc-group-filter").addEventListener("change", () => {
  stashRcDraft();
  rc.group = byId("rc-group-filter").value;
  rc.current = rcItems().find((item) => item.group === rc.group)?.key ?? null;
  renderRcFranchiseList();
  renderRcFranchiseForm();
});
byId("rc-new-franchise").addEventListener("click", () => {
  stashRcDraft();
  rc.group = "FRANCHISE";
  byId("rc-group-filter").value = "FRANCHISE";
  rc.current = rcNewKey;
  rc.ftab = "movie";
  renderRcFranchiseList();
  renderRcFranchiseForm();
});
byId("rc-f-extras").addEventListener("input", updateRcExtrasSummary);
byId("rc-f-tmdb-add-btn").addEventListener("click", addRcTmdb);
byId("rc-f-mdblist-add-btn").addEventListener("click", addRcMdblist);
for (const [id, handler] of [["rc-f-tmdb-add", addRcTmdb], ["rc-f-mdblist-add", addRcMdblist]]) {
  byId(id).addEventListener("keydown", (event) => {
    if (event.key === "Enter") { event.preventDefault(); handler(); }
  });
}
byId("rc-f-text").addEventListener("input", () => {
  byId("rc-f-count").textContent = `${rcLineCount(byId("rc-f-text").value)} Einträge in diesem Tab`;
});
byId("rc-f-cover").addEventListener("change", () => {
  const value = byId("rc-f-cover").value.trim();
  const preview = byId("rc-f-cover-preview");
  preview.classList.toggle("hidden", !/^https:\/\//.test(value));
  if (/^https:\/\//.test(value)) preview.src = value;
});
byId("rc-franchise-form").addEventListener("submit", saveRcFranchise);
byId("rc-f-reset").addEventListener("click", removeRcFranchise);
byId("rc-f-delete").addEventListener("click", removeRcFranchise);
byId("rc-standards-form").addEventListener("submit", saveRcStandards);
byId("rc-nr-add").addEventListener("click", addRcNewRow);

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
  byId("global-action-summary").classList.toggle("is-destructive", /^(delete|clear|remove)_/.test(operation));
  const noSettings = byId("global-no-settings");
  noSettings.dataset.defaultText ??= noSettings.textContent;
  noSettings.textContent = operation === "remove_obsolete_catalogs"
    ? "Entfernt aus allen Accounts Netzwerk-, Studio- und Featured-Collections (collection_network_*, collection_studio_*, collection_featured_*) " +
      "sowie die ersetzte Liste kingkearney/dc-universe aus Collections, die noch eine andere Liste haben. " +
      "Die aktuelle App liefert diese Einträge nicht mehr aus und verwirft sie selbst; alle anderen Kataloge, " +
      "Titel und Einstellungen bleiben unverändert. Prüfe die Anzahl in der Vorschau."
    : noSettings.dataset.defaultText;
  const needsTarget = /^(edit|delete|rename|set)_/.test(operation) || operation === "change_xtream_host" ||
    operation === "clear_catalog_source" || operation.endsWith("_catalog_item");
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
    editsData || hostOnly || operation === "rename_catalog" || operation === "set_catalog_enabled" ||
      operation === "set_catalog_source" || operation === "set_catalog_slug" || operation === "add_catalog_item" ||
      operation === "set_catalog_addon");
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
  const defaultItems = defaultCatalogTargets(operation);
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = (defaultItems || items).length ? "Eintrag auswählen" : "Keine Einträge vorhanden";
  select.append(placeholder);
  const groups = new Map();
  for (const item of defaultItems || items) {
    const option = document.createElement("option");
    option.value = item.id;
    option.textContent = item.label || `${item.name} · ${item.accountCount} Account(s) · ${item.id}`;
    let parent = select;
    if (item.group) {
      if (!groups.has(item.group)) {
        const optgroup = document.createElement("optgroup");
        optgroup.label = item.group;
        groups.set(item.group, optgroup);
        select.append(optgroup);
      }
      parent = groups.get(item.group);
    }
    parent.append(option);
  }
  if ((defaultItems || items).some((item) => item.id === previous)) select.value = previous;
  renderTargetDetails(defaultItems);
}

// Targets of the bundled-list operations: one entry per editable list (home row URL or collection slug).
function shortMdblistValue(value) {
  return String(value).replace(/^https?:\/\/(www\.)?mdblist\.com\/lists\//i, "");
}

// "Popular 2020s Movies · snoak/top-2020s-movies" when the list name is known, else just the list.
function mdblistListLabel(value) {
  const slug = shortMdblistValue(value);
  const title = state.mdblistTitles?.[slug];
  return title ? `${title} · ${slug}` : slug;
}

async function loadMdblistTitles() {
  const slugs = new Set();
  for (const catalog of state.defaultCatalogs || []) {
    for (const source of catalog.sources) {
      if (source.key.startsWith("addon:")) continue;
      for (const variant of source.variants) slugs.add(shortMdblistValue(variant.value));
    }
  }
  state.mdblistTitles = state.mdblistTitles || {};
  const missing = [...slugs].filter((slug) => !(slug in state.mdblistTitles));
  if (!missing.length) return;
  try {
    for (let index = 0; index < missing.length; index += 30) {
      const batch = missing.slice(index, index + 30);
      const result = await api(`/admin-api/global/mdblist-titles?slugs=${encodeURIComponent(batch.join(","))}`);
      Object.assign(state.mdblistTitles, result.titles);
    }
    updateGlobalFields();
  } catch {
    // Titles are a convenience; the lists stay usable without them.
  }
}

// "movie · mdblist.88328 · aio-metadata" from the listing value "type|catalogId|addonId|manifestUrl".
function addonVariantLabel(value) {
  const [type, catalogId, addonId, ...manifest] = String(value).split("|");
  const manifestUrl = manifest.join("|");
  return [type, catalogId, addonId || null, manifestUrl ? `Manifest ${manifestUrl}` : null].filter(Boolean).join(" · ");
}

// The TMDB id as the admin typed it; TMDB blocks automatic title lookups, so there is no name.
function tmdbRefLabel(ref) {
  return ref;
}

function defaultCatalogTargets(operation) {
  if (operation === "add_catalog_item" || operation === "remove_catalog_item") {
    const targets = [];
    for (const catalog of state.defaultCatalogs || []) {
      if (!catalog.id.startsWith("collection_franchise_")) continue;
      const extras = catalog.extraRefs || [];
      const details = {
        title: catalog.title, id: catalog.id, label: "Ergänzte Titel",
        note: extras.length
          ? "Von dir ergänzt (zusätzlich zu den fest eingebauten Quellen der App):"
          : "Noch keine Titel ergänzt.",
        variants: extras.map(({ ref, accounts }) => ({ value: ref, accounts })),
      };
      if (operation === "add_catalog_item") {
        targets.push({ id: catalog.id, label: `${catalog.title} · ${catalog.id}`, group: "Franchises", details });
      } else {
        for (const { ref, accounts } of extras) {
          targets.push({
            id: `${catalog.id}#${ref}`,
            label: `${catalog.title} — ${tmdbRefLabel(ref)} (${accounts} Accounts)`,
            group: "Franchises", details,
          });
        }
      }
    }
    return targets;
  }
  if (operation === "set_catalog_addon") {
    const targets = [];
    for (const catalog of state.defaultCatalogs || []) {
      if (catalog.kind !== "collection") continue;
      for (const source of catalog.sources.filter((item) => item.key.startsWith("addon:"))) {
        const accounts = source.variants.reduce((sum, variant) => sum + variant.accounts, 0);
        const mixed = source.variants.length > 1 ? ` · ${source.variants.length} verschiedene Werte` : "";
        const first = source.variants[0]?.value || "";
        const [type, catalogId] = first.split("|");
        targets.push({
          id: `${catalog.id}#${type}|${catalogId}`,
          label: `${catalog.title} · ${addonVariantLabel(first)}${mixed} (${accounts} Accounts)`,
          group: `${catalog.title} · ${catalog.id}`,
          details: { title: catalog.title, id: catalog.id, label: source.label, variants: source.variants },
        });
      }
    }
    return targets;
  }
  if (!["set_catalog_source", "set_catalog_slug", "clear_catalog_source"].includes(operation)) return null;
  const wanted = operation === "set_catalog_source" ? "home" : operation === "set_catalog_slug" ? "collection" : null;
  const targets = [];
  for (const catalog of state.defaultCatalogs || []) {
    if (wanted && catalog.kind !== wanted) continue;
    const group = catalog.kind === "home" ? "Home-Reihen" : `${catalog.title} · ${catalog.id}`;
    for (const source of catalog.sources) {
      if (operation === "set_catalog_slug" && !source.key.startsWith("slug:")) continue;
      if (operation === "clear_catalog_source" && source !== catalog.sources[0]) continue;
      const accounts = source.variants.reduce((sum, variant) => sum + variant.accounts, 0);
      const mixed = source.variants.length > 1 ? ` · ${source.variants.length} verschiedene Werte` : "";
      const current = shortMdblistValue(source.variants[0]?.value || "");
      let label;
      if (operation === "clear_catalog_source") label = `${catalog.title} · ${catalog.id}`;
      else if (catalog.kind === "home") label = `${catalog.title} — ${mdblistListLabel(source.variants[0]?.value || "")}${mixed} (${accounts} Accounts)`;
      else label = `${catalog.title} · ${mdblistListLabel(source.variants[0]?.value || "")}${mixed} (${accounts} Accounts)`;
      targets.push({
        id: operation === "set_catalog_slug" ? `${catalog.id}#${source.variants[0]?.value || ""}` : catalog.id,
        label,
        group: operation === "clear_catalog_source" ? "Standard-Listen" : group,
        details: { title: catalog.title, id: catalog.id, label: source.label, variants: source.variants },
      });
    }
  }
  return targets;
}

function renderTargetDetails(targets) {
  const panel = byId("global-target-details");
  panel.replaceChildren();
  const selected = (targets || []).find((target) => target.id === byId("global-target").value);
  panel.classList.toggle("hidden", !selected);
  if (!selected) return;
  const { details } = selected;
  const heading = document.createElement("strong");
  heading.textContent = `${details.title} · ${details.id}`;
  const note = document.createElement("span");
  note.textContent = details.note || (details.variants.length > 1
    ? `${details.label}: In den Accounts kommen ${details.variants.length} verschiedene Werte vor (meist ältere App-Versionen). Die Änderung ersetzt alle.`
    : `${details.label}: In allen betroffenen Accounts gleich.`);
  const list = document.createElement("ul");
  list.className = "target-detail-list";
  for (const variant of details.variants) {
    const item = document.createElement("li");
    const value = document.createElement("code");
    const slug = shortMdblistValue(variant.value);
    value.textContent = /^(movie|tv):\d+$/.test(variant.value)
      ? tmdbRefLabel(variant.value)
      : /^[a-z]+\|/.test(variant.value) && details.label === "Addon-Katalog" ? addonVariantLabel(variant.value)
      : state.mdblistTitles?.[slug] ? `${state.mdblistTitles[slug]} · ${variant.value}` : variant.value;
    const count = document.createElement("span");
    count.textContent = `${variant.accounts} Account${variant.accounts === 1 ? "" : "s"}`;
    item.append(value, count);
    list.append(item);
  }
  panel.append(heading, note, list);
}

function updateGlobalCatalogFields() {
  const operation = byId("global-operation").value;
  const adding = operation === "add_catalog";
  const renaming = operation === "rename_catalog";
  const settingEnabled = operation === "set_catalog_enabled";
  const settingSource = operation === "set_catalog_source" || operation === "set_catalog_slug";
  const addingItem = operation === "add_catalog_item";
  const settingAddon = operation === "set_catalog_addon";
  const sourceOperation = settingSource || settingAddon || operation === "clear_catalog_source";
  byId("global-catalog-fields").classList.toggle("hidden", !adding && !renaming && !settingEnabled && !sourceOperation && !addingItem);
  byId("global-catalog-source-note").classList.toggle("hidden", !sourceOperation);
  byId("global-catalog-value-label").textContent = addingItem
    ? "Film oder Serie (TMDB-Link oder tv:ID / movie:ID)"
    : settingAddon ? "Neue Katalog-ID im Addon (z. B. mdblist.88328)"
    : "Neue MDBList-Liste (URL oder Benutzer/Liste)";
  byId("global-catalog-value").placeholder = addingItem
    ? "https://www.themoviedb.org/tv/84773 oder tv:84773"
    : settingAddon ? "mdblist.88328"
    : "https://mdblist.com/lists/snoak/trending-movies oder snoak/trending-movies";
  const type = byId("global-catalog-type").value;
  const template = type === "PREINSTALLED" || type === "ADDON";
  for (const [id, visible] of [
    ["type", adding], ["template", adding && template], ["url", adding && !template],
    ["title", adding || renaming], ["enabled", adding || settingEnabled],
    ["value", settingSource || addingItem || settingAddon],
    ["addon-id", settingAddon], ["manifest", settingAddon],
  ]) {
    byId(`global-catalog-${id}-field`).classList.toggle("hidden", !visible);
    byId(`global-catalog-${id}`).disabled = !visible;
  }
  byId("global-catalog-value").required = settingSource || addingItem || settingAddon;
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
    if (operation === "set_catalog_slug") {
      const separator = request.targetId.indexOf("#");
      const fromSlug = request.targetId.slice(separator + 1);
      request.targetId = request.targetId.slice(0, separator);
      request.data = { fromSlug, mdblistSlug: byId("global-catalog-value").value.trim() };
    } else if (operation === "set_catalog_addon") {
      const separator = request.targetId.indexOf("#");
      const [fromType, fromCatalogId] = request.targetId.slice(separator + 1).split("|");
      request.targetId = request.targetId.slice(0, separator);
      request.data = {
        fromType, fromCatalogId,
        addonCatalogId: byId("global-catalog-value").value.trim(),
        addonId: byId("global-catalog-addon-id").value.trim(),
        addonManifestUrl: byId("global-catalog-manifest").value.trim(),
      };
    } else if (operation === "add_catalog_item") {
      request.data = { ref: byId("global-catalog-value").value.trim() };
    } else if (operation === "remove_catalog_item") {
      const separator = request.targetId.indexOf("#");
      request.data = { ref: request.targetId.slice(separator + 1) };
      request.targetId = request.targetId.slice(0, separator);
    } else if (operation === "set_catalog_source") {
      request.data = { sourceUrl: byId("global-catalog-value").value.trim() };
    } else if (operation === "add_catalog") {
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

function setMobileMenuOpen(open) {
  const toggle = byId("mobile-menu-toggle");
  toggle.setAttribute("aria-expanded", String(open));
  toggle.setAttribute("aria-label", open ? "Menü schließen" : "Menü öffnen");
  toggle.closest(".sidebar").classList.toggle("menu-open", open);
}

byId("mobile-menu-toggle").addEventListener("click", () => {
  setMobileMenuOpen(byId("mobile-menu-toggle").getAttribute("aria-expanded") !== "true");
});
document.addEventListener("keydown", event => {
  if (event.key === "Escape" && byId("mobile-menu-toggle").getAttribute("aria-expanded") === "true") {
    setMobileMenuOpen(false);
    byId("mobile-menu-toggle").focus();
  }
});
window.matchMedia("(max-width: 720px)").addEventListener("change", () => setMobileMenuOpen(false));

function selectView(view) {
  if (byId("mobile-menu-toggle").getAttribute("aria-expanded") === "true") {
    byId("mobile-menu-toggle").focus();
    setMobileMenuOpen(false);
  }
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
  renderTargetDetails(defaultCatalogTargets(byId("global-operation").value));
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
  byId("payload-viewer").classList.add("hidden");
  byId("payload-edit-data").value = JSON.stringify(snapshot.payload, null, 2);
  byId("payload-edit-message").textContent = "";
  byId("payload-edit-message").className = "message";
  byId("payload-edit-form").classList.remove("hidden");
});
byId("payload-edit-cancel").addEventListener("click", () => {
  byId("payload-edit-form").classList.add("hidden");
  byId("payload-viewer").classList.remove("hidden");
});
byId("snapshot-search").addEventListener("input", (event) => {
  clearTimeout(snapshotViewer.searchTimer);
  snapshotViewer.searchTimer = setTimeout(() => {
    snapshotViewer.query = event.target.value;
    renderSnapshotTree();
  }, 180);
});
byId("snapshot-expand-all").addEventListener("click", () => {
  snapshotViewer.openDepth = Infinity;
  renderSnapshotTree();
});
byId("snapshot-collapse-all").addEventListener("click", () => {
  snapshotViewer.openDepth = 0;
  renderSnapshotTree();
});
byId("snapshot-view-toggle").addEventListener("click", () => {
  snapshotViewer.raw = !snapshotViewer.raw;
  applySnapshotViewMode();
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
