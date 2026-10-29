import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const source = await readFile(new URL("../public/admin.js", import.meta.url), "utf8");
const context = vm.createContext({});
for (const name of ["formatBytes", "formatAuditOperation", "versionReleaseUrl", "latestDeviceEntries", "globalOperationCategory", "formatDeviceEvent"]) {
  const definition = source.match(new RegExp(`function ${name}\\([^]*?\\n\\}`));
  assert.ok(definition, `Missing ${name}`);
  vm.runInContext(definition[0], context);
}

test("device events have readable labels without hiding unknown event types", () => {
  assert.equal(context.formatDeviceEvent("heartbeat"), "Live-Status gemeldet");
  assert.equal(context.formatDeviceEvent("app_open"), "App gestartet");
  assert.equal(context.formatDeviceEvent("active_session"), "Login erstellt");
  assert.equal(context.formatDeviceEvent("custom_event"), "custom_event");
  assert.equal(context.formatDeviceEvent("constructor"), "constructor");
  assert.equal(context.formatDeviceEvent(null), "—");
  assert.equal(context.formatDeviceEvent(""), "—");
});

test("Remote Config assigns every existing action to exactly one area", async () => {
  const html = await readFile(new URL("../public/admin.html", import.meta.url), "utf8");
  const select = html.match(/<select id="global-operation">([^]*?)<\/select>/)[1];
  const operations = [...select.matchAll(/value="([^"]+)"/g)].map(match => match[1]);
  const groups = { playlists: [], addons: [], catalogs: [] };
  for (const operation of operations) groups[context.globalOperationCategory(operation)].push(operation);
  assert.deepEqual(groups, {
    playlists: ["add_playlist", "edit_playlist", "change_xtream_host", "clear_streamnet_host_override", "delete_playlist", "clear_playlists"],
    addons: ["add_addon", "edit_addon", "delete_addon", "clear_addons"],
    catalogs: ["add_catalog", "rename_catalog", "set_catalog_enabled", "delete_catalog"],
  });
  for (const group of Object.keys(groups)) {
    assert.ok(html.includes(`data-global-category="${group}"`));
  }
});

test("device list keeps the latest entry per kind, platform and device type", () => {
  const devices = [
    { install_id: "old-tv", kind: "app_event", platform: "android", device_type: "tv", last_seen: "2026-10-20T00:00:00Z" },
    { install_id: "new-tv", kind: "app_event", platform: "android", device_type: "tv", last_seen: "2026-10-29T00:00:00Z" },
    { install_id: "mobile", kind: "app_event", platform: "android", device_type: "mobile", last_seen: "2026-10-28T00:00:00Z" },
    { install_id: "session", kind: "session", platform: "android", device_type: "tv", last_seen: "2026-10-27T00:00:00Z" },
    { install_id: "web", kind: "app_event", platform: "web", device_type: "tv", last_seen: "2026-10-26T00:00:00Z" },
  ];
  const result = context.latestDeviceEntries(devices);
  assert.equal(result.length, devices.length);
  assert.equal(result.filter(entry => entry.older).length, 1);
  assert.equal(result.find(entry => entry.older).device.install_id, "old-tv");
  assert.equal(devices[0].install_id, "old-tv");
});

test("individual account actions share the category layout without adding unsupported catalog actions", async () => {
  const html = await readFile(new URL("../public/admin.html", import.meta.url), "utf8");
  const select = html.match(/<select id="mutation-operation">([^]*?)<\/select>/)[1];
  const operations = [...select.matchAll(/value="([^"]+)"/g)].map(match => match[1]);
  assert.deepEqual(operations.filter(operation => context.globalOperationCategory(operation) === "playlists"),
    ["upsert_playlist", "delete_playlist", "change_streamnet_host", "clear_streamnet_host_override"]);
  assert.deepEqual(operations.filter(operation => context.globalOperationCategory(operation) === "addons"),
    ["upsert_addon", "delete_addon"]);
  assert.equal(operations.some(operation => context.globalOperationCategory(operation) === "catalogs"), false);
  for (const id of ["account-action-title", "account-settings-title", "account-confirm-title", "account-scope-title"]) {
    assert.ok(html.includes(`aria-labelledby="${id}"`));
  }
  assert.ok(html.includes('id="mutation-form" class="global-config-layout"'));
  assert.ok(html.includes('data-account-category="playlists"'));
  assert.ok(html.includes('data-account-category="addons"'));
});

test("version cards link to component changelogs and the published Android release", () => {
  const repository = "https://github.com/cyb3rgh05t/streamnet-debrid";
  assert.equal(context.versionReleaseUrl("android", "2.5.081"), `${repository}/releases/tag/2.5.081`);
  for (const component of ["backend", "web"]) {
    const url = new URL(context.versionReleaseUrl(component, "1.0.031"));
    assert.equal(url.pathname, "/cyb3rgh05t/streamnet-debrid/blob/main/CHANGELOG.md");
    assert.equal(decodeURIComponent(url.hash), `#:~:text=[${component === "backend" ? "Backend" : "Web"} 1.0.031]`);
  }
});

test("memory formatting uses readable units and German decimals", () => {
  for (const [bytes, expected] of [
    [0, "0 B"], [1024, "1 KB"], [116.4 * 1024 ** 2, "116,4 MB"],
    [118921.4 * 1024 ** 2, "116,1 GB"], [128719.4 * 1024 ** 2, "125,7 GB"],
    [1024 ** 4, "1 TB"],
  ]) {
    assert.equal(context.formatBytes(bytes), expected);
  }
});

test("audit operation labels are readable and retain global scope", () => {
  assert.equal(context.formatAuditOperation("clear_streamnet_host_override"), "StreamNet-TV-Server zurückgesetzt");
  assert.equal(context.formatAuditOperation("change_streamnet_host"), "StreamNet-TV-Server geändert");
  assert.equal(context.formatAuditOperation("global_add_catalog"), "Global: Katalog hinzugefügt / aktualisiert");
  assert.equal(context.formatAuditOperation("global_set_catalog_enabled"), "Global: Katalogaktivierung geändert");
  assert.equal(context.formatAuditOperation("revoke_sessions"), "Alle Logins widerrufen");
  assert.equal(context.formatAuditOperation("unknown_operation"), "unknown_operation");
  assert.equal(context.formatAuditOperation("global_future_operation"), "global_future_operation");
  assert.equal(context.formatAuditOperation("constructor"), "constructor");
  assert.equal(context.formatAuditOperation(null), null);
});
