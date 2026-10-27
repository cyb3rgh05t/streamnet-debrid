import assert from "node:assert/strict";
import test from "node:test";
import {
  applyAdminSnapshotMutation,
  adminGlobalInventory,
  applyAdminGlobalMutation,
  prepareAdminGlobalMutation,
  hydrateAdminStremioAddon,
  redactAdminPayload,
  summarizeAdminPayload,
  resolveAdminCatalogTemplate,
} from "../src/admin-snapshots.js";

const addonManifest = () => ({
  id: "org.example.addon",
  name: "Example Addon",
  version: "2.1.0",
  description: "Example streams",
  logo: "https://example.test/logo.png",
  background: "https://example.test/background.jpg",
  types: ["movie", "series"],
  resources: [
    "stream",
    { name: "catalog", types: ["Movie"], idPrefixes: ["tt"] },
  ],
  catalogs: [
    {
      type: "movie",
      id: "popular",
      name: "Popular",
      genres: ["Action"],
      extra: [{ name: "genre", isRequired: false, options: ["Action"] }],
    },
  ],
  idPrefixes: ["tt"],
  behaviorHints: { configurable: true, p2p: true },
});

const snapshot = () => ({
  profiles: [
    { id: "living-room", name: "Living room" },
    { id: "kids", name: "Kids" },
  ],
  addonsByProfile: { "living-room": [], kids: [] },
  iptvByProfile: { "living-room": { playlists: [] }, kids: { playlists: [] } },
  catalogsByProfile: { "living-room": [{ id: "movies" }] },
  watchlistByProfile: { kids: [{ id: "1" }] },
});

test("global inventory deduplicates playlists and includes top-level addons without URLs", () => {
  const value = snapshot();
  value.addons = [{ id: "a", name: "A", url: "https://private.test/token" }];
  for (const profile of value.profiles) {
    value.iptvByProfile[profile.id].playlists = [{
      id: "tv", name: "TV", m3uUrl: "https://private.test/list",
    }];
  }
  assert.deepEqual(adminGlobalInventory(value), {
    profileCount: 2,
    addons: [{ id: "a", name: "A" }],
    playlists: [{ id: "tv", name: "TV" }],
    catalogs: [{ id: "movies", name: "movies", sourceType: "" }],
  });
});

test("remote list catalogs add to every profile with Android and web names and timestamps", () => {
  const value = snapshot();
  for (const [sourceType, sourceUrl, sourceRef] of [
    ["TRAKT", "https://trakt.tv/users/owner/lists/favorites", "trakt_user:owner:favorites"],
    ["TRAKT", "https://trakt.tv/lists/123", "trakt_list:123"],
    ["MDBLIST", "https://mdblist.com/lists/owner/favorites", "mdblist:https://mdblist.com/lists/owner/favorites"],
  ]) {
    const mutation = prepareAdminGlobalMutation({ operation: "add_catalog", data: { sourceType, sourceUrl, title: "Remote favorites", enabled: false } });
    const result = applyAdminGlobalMutation(value, mutation, 7000);
    for (const profile of value.profiles) {
      const catalog = result.catalogsByProfile[profile.id].find((item) => item.id === mutation.data.id);
      assert.equal(catalog.title, "Remote favorites");
      assert.equal(catalog.name, catalog.title);
      assert.equal(catalog.sourceRef, sourceRef);
      assert.equal(catalog.enabled, false);
      assert.equal(result.catalogsUpdatedAtByProfile[profile.id], 7000);
      assert.ok(result.hiddenCustomByProfile[profile.id].includes(catalog.id));
    }
    assert.equal(applyAdminGlobalMutation(result, mutation), null);
    assert.deepEqual(value, snapshot());
  }
});

test("new remote catalogs prepend per profile while updates preserve existing order", () => {
  for (const sourceType of ["TRAKT", "MDBLIST", "PREINSTALLED", "ADDON"]) {
    const value = snapshot();
    const mutation = ["TRAKT", "MDBLIST"].includes(sourceType)
      ? prepareAdminGlobalMutation({
        operation: "add_catalog",
        data: {
          sourceType,
          sourceUrl: sourceType === "TRAKT"
            ? "https://trakt.tv/users/owner/lists/favorites"
            : "https://mdblist.com/lists/owner/favorites",
          title: "Remote favorites",
        },
      })
      : {
        operation: "add_catalog",
        data: {
          id: `remote-${sourceType}`, sourceType, title: "Remote favorites",
          enabled: true, ...(sourceType === "ADDON" ? { addonId: "installed-addon" } : {}),
        },
      };
    if (sourceType === "ADDON") value.addons = [{ id: "installed-addon" }];
    const existing = {
      ...mutation.data, title: "Old title", enabled: false, tileShape: "LANDSCAPE",
    };
    value.catalogsByProfile = {
      "living-room": [{ id: "tv_favorites" }, { id: "recent_tv" }, { id: "movies" }],
      kids: [{ id: "kids-first" }, existing, { id: "kids-last" }],
    };
    value.hiddenCustomByProfile = { kids: [existing.id] };
    const original = structuredClone(value);
    const result = applyAdminGlobalMutation(value, mutation, 7600);
    assert.deepEqual(
      result.catalogsByProfile["living-room"].map((catalog) => catalog.id),
      [mutation.data.id, "tv_favorites", "recent_tv", "movies"],
    );
    assert.deepEqual(
      result.catalogsByProfile.kids.map((catalog) => catalog.id),
      ["kids-first", mutation.data.id, "kids-last"],
    );
    assert.equal(result.catalogsByProfile.kids[1].title, "Remote favorites");
    assert.equal(result.catalogsByProfile.kids[1].tileShape, "LANDSCAPE");
    assert.equal(result.catalogsByProfile.kids[1].enabled, true);
    assert.equal(result.catalogsUpdatedAtByProfile["living-room"], 7600);
    assert.equal(result.catalogsUpdatedAtByProfile.kids, 7600);
    assert.equal(applyAdminGlobalMutation(result, mutation, 7700), null);
    assert.deepEqual(value, original);
  }
});

test("new remote catalogs prepend legacy catalogs and respect explicitly empty profiles", () => {
  const value = snapshot();
  value.catalogs = [{ id: "legacy-first" }, { id: "legacy-last" }];
  value.catalogsByProfile = { kids: [] };
  const mutation = prepareAdminGlobalMutation({
    operation: "add_catalog",
    data: {
      sourceType: "MDBLIST", sourceUrl: "https://mdblist.com/lists/owner/favorites",
      title: "Remote favorites",
    },
  });
  const result = applyAdminGlobalMutation(value, mutation, 7800);
  assert.deepEqual(
    result.catalogsByProfile["living-room"].map((catalog) => catalog.id),
    [mutation.data.id, "legacy-first", "legacy-last"],
  );
  assert.deepEqual(result.catalogsByProfile.kids.map((catalog) => catalog.id), [mutation.data.id]);
  assert.deepEqual(result.catalogs, value.catalogs);
});

test("catalog rename affects matching IDs only and preserves source and collection data", () => {
  const value = snapshot();
  value.catalogsByProfile["living-room"] = [{
    id: "movies", title: "Movies", sourceType: "PREINSTALLED",
    collectionSources: [{ kind: "TMDB_GENRE", tmdbGenreId: 28 }], enabled: true,
  }];
  const result = applyAdminGlobalMutation(value, prepareAdminGlobalMutation({
    operation: "rename_catalog", targetId: "movies", data: { title: "Cinema" },
  }), 7100);
  const item = result.catalogsByProfile["living-room"][0];
  assert.equal(item.name, "Cinema");
  assert.equal(item.title, "Cinema");
  assert.equal(item.remoteTitle, "Cinema");
  assert.deepEqual(item.collectionSources, value.catalogsByProfile["living-room"][0].collectionSources);
  assert.equal(result.catalogsUpdatedAtByProfile["living-room"], 7100);
  assert.equal(result.catalogsUpdatedAtByProfile.kids, undefined);
  assert.equal(applyAdminGlobalMutation(result, prepareAdminGlobalMutation({
    operation: "rename_catalog", targetId: "missing", data: { title: "Cinema" },
  })), null);
});

test("removing and re-enabling a default catalog maintains a hidden tombstone", () => {
  const value = snapshot();
  value.catalogsByProfile["living-room"] = [{
    id: "movies", title: "Movies", sourceType: "PREINSTALLED", isPreinstalled: true, enabled: true,
  }];
  const deleted = applyAdminGlobalMutation(value, prepareAdminGlobalMutation({
    operation: "delete_catalog", targetId: "movies",
  }), 7200);
  assert.equal(deleted.catalogsByProfile["living-room"][0].enabled, false);
  assert.ok(deleted.hiddenPreinstalledByProfile["living-room"].includes("movies"));
  assert.equal(deleted.catalogsByProfile["living-room"][0].remoteManaged, true);
  const enabled = applyAdminGlobalMutation(deleted, prepareAdminGlobalMutation({
    operation: "set_catalog_enabled", targetId: "movies", data: { enabled: true },
  }), 7300);
  assert.equal(enabled.catalogsByProfile["living-room"][0].enabled, true);
  assert.deepEqual(enabled.hiddenPreinstalledByProfile["living-room"], []);
  assert.equal(enabled.catalogsUpdatedAtByProfile["living-room"], 7300);
});

test("custom catalog removal respects explicit empty profile arrays and does not leak legacy catalogs", () => {
  const value = snapshot();
  value.catalogs = [{ id: "legacy", title: "Legacy", sourceType: "TRAKT" }];
  value.catalogsByProfile = {
    "living-room": [{ id: "custom", title: "Custom", sourceType: "MDBLIST" }],
    kids: [],
  };
  const deleted = applyAdminGlobalMutation(value, prepareAdminGlobalMutation({
    operation: "delete_catalog", targetId: "custom",
  }));
  assert.deepEqual(deleted.catalogsByProfile["living-room"], []);
  assert.deepEqual(deleted.catalogsByProfile.kids, []);
  assert.deepEqual(adminGlobalInventory(deleted).catalogs, []);
});

test("addon catalog inventory derives Android instance IDs and supports hiding and renaming", () => {
  const value = applyAdminSnapshotMutation(snapshot(), {
    operation: "upsert_addon", data: { url: "https://addon.test", manifest: addonManifest() },
  });
  const catalog = adminGlobalInventory(value).catalogs.find((item) => item.sourceType === "ADDON");
  const template = resolveAdminCatalogTemplate(value, catalog.id);
  assert.match(template.id, /^addon_[a-f0-9]{16}$/);
  assert.match(template.sourceRef, /^addon_catalog\|/);
  const result = applyAdminGlobalMutation(value, {
    operation: "add_catalog", data: { ...template, enabled: true },
  }, 7500);
  assert.ok(result.catalogsByProfile.kids.some((item) => item.id === catalog.id));
  assert.equal(applyAdminGlobalMutation(snapshot(), { operation: "add_catalog", data: template }), null);
  const deleted = applyAdminGlobalMutation(result, prepareAdminGlobalMutation({
    operation: "delete_catalog", targetId: catalog.id,
  }));
  assert.ok(deleted.hiddenAddonByProfile.kids.includes(catalog.id));
  assert.equal(deleted.catalogsByProfile.kids[0].enabled, false);
  const renamed = applyAdminGlobalMutation(deleted, prepareAdminGlobalMutation({
    operation: "rename_catalog", targetId: catalog.id, data: { title: "Hidden movies" },
  }));
  assert.equal(renamed.catalogsByProfile.kids[0].enabled, false);
  assert.ok(renamed.hiddenAddonByProfile.kids.includes(catalog.id));
});

test("catalog validation rejects unsupported sources, URLs, unsafe IDs and invalid activation", () => {
  for (const data of [
    { sourceType: "OTHER", title: "Name" },
    { sourceType: "TRAKT", sourceUrl: "https://trakt.tv.evil.test/lists/1", title: "Name" },
    { sourceType: "TRAKT", sourceUrl: "https://trakt.tv/calendar", title: "Name" },
    { sourceType: "TRAKT", sourceUrl: "https://trakt.tv/lists/invalid", title: "Name" },
    { sourceType: "TRAKT", sourceUrl: "https://trakt.tv/lists/123", title: "Name", enabled: "false" },
    { sourceType: "MDBLIST", sourceUrl: "https://mdblist.com/lists/u/l", title: "" },
    { sourceType: "PREINSTALLED", templateId: "__proto__" },
  ]) assert.throws(() => prepareAdminGlobalMutation({ operation: "add_catalog", data }));
  assert.throws(() => prepareAdminGlobalMutation({ operation: "set_catalog_enabled", targetId: "movies", data: { enabled: "false" } }));
});

test("global playlist addition reaches every profile without changing unrelated data", () => {
  const value = snapshot();
  const result = applyAdminGlobalMutation(value, prepareAdminGlobalMutation({
    operation: "add_playlist",
    data: { name: "TV", m3uUrl: "https://provider.test/list" },
  }), 3000);
  assert.equal(result.iptvByProfile.kids.playlists.length, 1);
  assert.deepEqual(result.iptvByProfile.kids.playlists, result.iptvByProfile["living-room"].playlists);
  assert.equal(result.fieldUpdatedAt["i:kids:playlists"], 3000);
  assert.equal(result.updatedAt, 3000);
  assert.deepEqual(result.watchlistByProfile, value.watchlistByProfile);
  assert.deepEqual(value, snapshot());
});

test("global playlist edit keeps IDs and per-profile extra data, updates legacy mirrors and EPG lists", () => {
  const value = snapshot();
  value.iptvByProfile.kids = {
    playlists: [{ id: "tv", name: "Old", m3uUrl: "https://old.test", epgUrl: "https://old.test/epg", custom: "keep" }],
    m3uUrl: "https://old.test", epgUrl: "https://old.test/epg", epgUrls: ["https://old.test/epg"],
  };
  const result = applyAdminGlobalMutation(value, prepareAdminGlobalMutation({
    operation: "edit_playlist", targetId: "tv",
    data: { name: "New", m3uUrl: "https://new.test", epgUrl: "" },
  }), 3001);
  assert.equal(result.iptvByProfile.kids.playlists[0].id, "tv");
  assert.equal(result.iptvByProfile.kids.playlists[0].custom, "keep");
  assert.equal(result.iptvByProfile.kids.m3uUrl, "https://new.test");
  assert.equal(result.iptvByProfile.kids.epgUrl, "");
  assert.deepEqual(result.iptvByProfile.kids.epgUrls, []);
  assert.deepEqual(result.iptvByProfile["living-room"], value.iptvByProfile["living-room"]);
  assert.equal(result.fieldUpdatedAt["i:kids:epgUrls"], 3001);
  assert.equal(applyAdminGlobalMutation(snapshot(), prepareAdminGlobalMutation({
    operation: "edit_playlist", targetId: "tv", data: { m3uUrl: "https://new.test" },
  })), null);
});

test("global selected playlist removal preserves unrelated playlists and clears matching mirrors", () => {
  const value = snapshot();
  value.iptvByProfile.kids = {
    playlists: [{ id: "tv", m3uUrl: "https://old.test", epgUrl: "https://epg.test" }, { id: "other", m3uUrl: "https://other.test" }],
    m3uUrl: "https://old.test", epgUrl: "https://epg.test", epgUrls: ["https://epg.test"],
  };
  const result = applyAdminGlobalMutation(value, prepareAdminGlobalMutation({
    operation: "delete_playlist", targetId: "tv",
  }));
  assert.deepEqual(result.iptvByProfile.kids.playlists, [value.iptvByProfile.kids.playlists[1]]);
  assert.equal(result.iptvByProfile.kids.m3uUrl, "");
  assert.deepEqual(result.iptvByProfile.kids.epgUrls, []);
});

test("global playlist clearing removes lists and legacy URLs from all profiles", () => {
  const value = snapshot();
  value.iptvByProfile.kids = { m3uUrl: "https://legacy.test", epgUrl: "https://epg.test", epgUrls: ["https://epg.test"] };
  const result = applyAdminGlobalMutation(value, prepareAdminGlobalMutation({ operation: "clear_playlists" }), 4444);
  for (const profile of value.profiles) {
    assert.deepEqual(result.iptvByProfile[profile.id].playlists, []);
    assert.equal(result.iptvByProfile[profile.id].m3uUrl, "");
    assert.equal(result.iptvByProfile[profile.id].epgUrl, "");
  }
  assert.equal(applyAdminGlobalMutation(result, prepareAdminGlobalMutation({ operation: "clear_playlists" })), null);
});

test("global addon URL replacement preserves per-profile activation and removes the old ID", () => {
  const value = applyAdminSnapshotMutation(snapshot(), {
    operation: "upsert_addon", data: { url: "https://old.test/manifest.json", manifest: addonManifest() },
  });
  const oldId = value.addons[0].id;
  value.addonsByProfile.kids[0].isEnabled = false;
  const result = applyAdminGlobalMutation(value, prepareAdminGlobalMutation({
    operation: "edit_addon", targetId: oldId,
    data: { url: "https://new.test/manifest.json", manifest: addonManifest() },
  }), 5000);
  assert.equal(result.addons.length, 1);
  assert.notEqual(result.addons[0].id, oldId);
  assert.equal(result.addonsByProfile.kids[0].isEnabled, false);
  assert.equal(result.addonsByProfile["living-room"][0].isEnabled, true);
  assert.equal(result.addonsUpdatedAt, 5000);
  assert.equal(value.addonsByProfile.kids[0].id, oldId);
});

test("global addon adding, selected removal, clearing and no-op behavior", () => {
  const mutation = prepareAdminGlobalMutation({
    operation: "add_addon", data: { url: "https://addon.test", manifest: addonManifest(), isEnabled: false },
  });
  const value = applyAdminGlobalMutation(snapshot(), mutation, 5001);
  assert.equal(value.addonsByProfile.kids[0].isEnabled, false);
  assert.equal(applyAdminGlobalMutation(value, mutation), null);
  assert.equal(applyAdminGlobalMutation(value, prepareAdminGlobalMutation({
    operation: "delete_addon", targetId: "missing",
  })), null);
  for (const operation of ["delete_addon", "clear_addons"]) {
    const result = applyAdminGlobalMutation(value, prepareAdminGlobalMutation({
      operation, targetId: value.addons[0].id,
    }), 5002);
    assert.deepEqual(result.addons, []);
    assert.deepEqual(result.addonsByProfile.kids, []);
    assert.equal(result.addonsUpdatedAt, 5002);
  }
});

test("global mutations reject unsupported actions, unsafe IDs and invalid data", () => {
  for (const request of [
    { operation: "edit_payload" },
    { operation: "delete_addon", targetId: "__proto__" },
    { operation: "edit_playlist", data: { m3uUrl: "https://x.test" } },
    { operation: "add_playlist", data: {} },
  ]) assert.throws(() => prepareAdminGlobalMutation(request));
  const value = snapshot();
  value.profiles[0].id = "__proto__";
  assert.throws(() => applyAdminGlobalMutation(value, prepareAdminGlobalMutation({ operation: "clear_playlists" })), /profileId is invalid/);
});

test("Remote Config builds encoded Xtream M3U and EPG URLs without storing credential fields", () => {
  const mutation = prepareAdminGlobalMutation({
    operation: "add_playlist",
    data: { sourceType: "xtream", host: "https://provider.test:8080/sub/", username: "user+1", password: "pass &?", name: "Xtream" },
  });
  const result = applyAdminGlobalMutation(snapshot(), mutation);
  const playlist = result.iptvByProfile.kids.playlists[0];
  const m3u = new URL(playlist.m3uUrl);
  const epg = new URL(playlist.epgUrl);
  assert.equal(m3u.pathname, "/sub/get.php");
  assert.equal(m3u.searchParams.get("username"), "user+1");
  assert.equal(m3u.searchParams.get("password"), "pass &?");
  assert.equal(epg.pathname, "/sub/xmltv.php");
  assert.deepEqual(playlist.epgUrls, [playlist.epgUrl]);
  for (const field of ["host", "username", "password", "sourceType"]) {
    assert.equal(Object.hasOwn(playlist, field), false);
  }
});

test("Remote Config configures the fixed StreamNet TV ID and explicit remote host", () => {
  const value = snapshot();
  value.iptvByProfile.kids.playlists = [{ id: "streamnet_tv", name: "StreamNet TV", m3uUrl: "", enabled: false }];
  const result = applyAdminGlobalMutation(value, prepareAdminGlobalMutation({
    operation: "add_playlist",
    data: { sourceType: "streamnet_tv", host: "https://tv.test", username: "user", password: "pass" },
  }));
  for (const profile of value.profiles) {
    const playlists = result.iptvByProfile[profile.id].playlists;
    assert.equal(playlists.length, 1);
    assert.equal(playlists[0].id, "streamnet_tv");
    assert.equal(playlists[0].name, "StreamNet TV");
    assert.equal(playlists[0].streamNetHostOverride, "https://tv.test");
  }
});

test("Xtream host-only changes retain each profile's credentials and options", () => {
  const value = snapshot();
  value.iptvByProfile.kids = {
    playlists: [{ id: "streamnet_tv", name: "StreamNet TV", m3uUrl: "https://old.test first secret", epgUrl: "https://old.test first secret", enabled: false, importVod: false }],
    m3uUrl: "https://old.test first secret", epgUrl: "https://old.test first secret",
  };
  value.iptvByProfile["living-room"].playlists = [{
    id: "streamnet_tv", name: "StreamNet TV",
    m3uUrl: "https://old.test/get.php?username=second&password=secret%2B2&type=m3u_plus&output=m3u8",
    enabled: true, importSeries: false,
  }];
  const result = applyAdminGlobalMutation(value, prepareAdminGlobalMutation({
    operation: "change_xtream_host", targetId: "streamnet_tv", data: { host: "https://new.test:8080/base/" },
  }), 6000);
  const kids = result.iptvByProfile.kids.playlists[0];
  const living = result.iptvByProfile["living-room"].playlists[0];
  assert.equal(new URL(kids.m3uUrl).searchParams.get("username"), "first");
  assert.equal(new URL(living.m3uUrl).searchParams.get("username"), "second");
  assert.equal(new URL(living.m3uUrl).searchParams.get("password"), "secret+2");
  assert.equal(new URL(living.m3uUrl).searchParams.get("output"), "m3u8");
  assert.equal(new URL(kids.m3uUrl).pathname, "/base/get.php");
  assert.equal(kids.enabled, false);
  assert.equal(kids.importVod, false);
  assert.equal(living.importSeries, false);
  assert.equal(kids.streamNetHostOverride, "https://new.test:8080/base");
  assert.equal(result.iptvByProfile.kids.m3uUrl, kids.m3uUrl);
  assert.equal(result.fieldUpdatedAt["i:kids:playlists"], 6000);
  assert.equal(value.iptvByProfile.kids.playlists[0].m3uUrl, "https://old.test first secret");
});

test("Xtream host-only change rejects missing credentials and skips absent IDs", () => {
  const mutation = prepareAdminGlobalMutation({
    operation: "change_xtream_host", targetId: "tv", data: { host: "https://new.test" },
  });
  assert.equal(applyAdminGlobalMutation(snapshot(), mutation), null);
  const value = snapshot();
  value.iptvByProfile.kids.playlists = [{ id: "tv", m3uUrl: "https://example.test/list.m3u" }];
  assert.throws(() => applyAdminGlobalMutation(value, mutation), /no valid Xtream credentials/);
  assert.deepEqual(value.iptvByProfile.kids.playlists, [{ id: "tv", m3uUrl: "https://example.test/list.m3u" }]);
});

test("Xtream validation rejects invalid hosts, empty credentials and wrong StreamNet targets", () => {
  for (const host of ["", "file:///tmp", "https://user:pass@host.test", "https://host.test?secret=value", "https://host.test#fragment"]) {
    assert.throws(() => prepareAdminGlobalMutation({
      operation: "change_xtream_host", targetId: "tv", data: { host },
    }), /server URL is invalid/);
  }
  assert.throws(() => prepareAdminGlobalMutation({
    operation: "add_playlist", data: { sourceType: "xtream", host: "https://test.example", username: "user" },
  }), /username and password are required/);
  assert.throws(() => prepareAdminGlobalMutation({
    operation: "edit_playlist", targetId: "custom", data: { sourceType: "streamnet_tv", host: "https://test.example", username: "user", password: "pass" },
  }), /Select StreamNet TV/);
});

test("single-account StreamNet host change keeps credentials, options and other profiles on request", () => {
  const value = snapshot();
  value.iptvByProfile.kids = {
    playlists: [{ id: "streamnet_tv", name: "StreamNet TV", m3uUrl: "https://old.test/get.php?username=kid&password=pw&type=m3u_plus&output=ts", enabled: false, importVod: false }],
    m3uUrl: "https://old.test/get.php?username=kid&password=pw&type=m3u_plus&output=ts",
  };
  value.iptvByProfile["living-room"].playlists = [{
    id: "streamnet_tv", name: "StreamNet TV",
    m3uUrl: "https://old.test/get.php?username=adult&password=pw2&type=m3u_plus&output=ts", enabled: true,
  }];
  const all = applyAdminSnapshotMutation(value, {
    operation: "change_streamnet_host", data: { host: "https://new.test:8080/" },
  }, 7000);
  for (const [profile, user] of [["kids", "kid"], ["living-room", "adult"]]) {
    const playlist = all.iptvByProfile[profile].playlists[0];
    assert.equal(new URL(playlist.m3uUrl).origin, "https://new.test:8080");
    assert.equal(new URL(playlist.m3uUrl).searchParams.get("username"), user);
    assert.equal(playlist.streamNetHostOverride, "https://new.test:8080");
  }
  assert.equal(all.iptvByProfile.kids.playlists[0].enabled, false);
  assert.equal(all.iptvByProfile.kids.playlists[0].importVod, false);
  assert.equal(all.updatedAt, 7000);

  const single = applyAdminSnapshotMutation(value, {
    operation: "change_streamnet_host", profileId: "kids", data: { host: "https://new.test" },
  }, 7000);
  assert.equal(new URL(single.iptvByProfile.kids.playlists[0].m3uUrl).origin, "https://new.test");
  assert.equal(single.iptvByProfile["living-room"].playlists[0].m3uUrl, value.iptvByProfile["living-room"].playlists[0].m3uUrl);
  assert.equal(new URL(value.iptvByProfile.kids.playlists[0].m3uUrl).origin, "https://old.test");
});

test("single-account StreamNet host change rejects missing setup, unchanged host and bad input", () => {
  const value = snapshot();
  assert.throws(() => applyAdminSnapshotMutation(value, {
    operation: "change_streamnet_host", data: { host: "https://new.test" },
  }), /not configured for this account/);
  value.iptvByProfile.kids.playlists = [{ id: "streamnet_tv", m3uUrl: "https://old.test/get.php?username=u&password=p" }];
  assert.throws(() => applyAdminSnapshotMutation(value, {
    operation: "change_streamnet_host", profileId: "living-room", data: { host: "https://new.test" },
  }), /not configured for this account/);
  assert.throws(() => applyAdminSnapshotMutation(value, {
    operation: "change_streamnet_host", profileId: "missing", data: { host: "https://new.test" },
  }), /Unknown profile/);
  assert.throws(() => applyAdminSnapshotMutation(value, {
    operation: "change_streamnet_host", data: { host: "file:///tmp" },
  }), /server URL is invalid/);
  const changed = applyAdminSnapshotMutation(value, {
    operation: "change_streamnet_host", data: { host: "https://new.test" },
  });
  assert.throws(() => applyAdminSnapshotMutation(changed, {
    operation: "change_streamnet_host", data: { host: "https://new.test" },
  }), /already set/);
});

test("global StreamNet host override removal keeps credentials and options and skips accounts without override", () => {
  const value = snapshot();
  value.iptvByProfile.kids = {
    playlists: [{
      id: "streamnet_tv", name: "StreamNet TV", enabled: false, importVod: false,
      m3uUrl: "https://remote.test/get.php?username=kid&password=pw&type=m3u_plus&output=ts",
      streamNetHostOverride: "https://remote.test",
    }],
  };
  value.iptvByProfile["living-room"].playlists = [{
    id: "streamnet_tv", name: "StreamNet TV", enabled: true,
    m3uUrl: "https://builtin.test/get.php?username=adult&password=pw2",
  }];
  const mutation = prepareAdminGlobalMutation({ operation: "clear_streamnet_host_override" });
  assert.equal(mutation.targetId, "streamnet_tv");

  const result = applyAdminGlobalMutation(value, mutation, 8000);
  const kids = result.iptvByProfile.kids.playlists[0];
  assert.equal(Object.hasOwn(kids, "streamNetHostOverride"), false);
  assert.equal(kids.m3uUrl, value.iptvByProfile.kids.playlists[0].m3uUrl);
  assert.equal(kids.enabled, false);
  assert.equal(kids.importVod, false);
  assert.equal(result.fieldUpdatedAt["i:kids:playlists"], 8000);
  assert.equal(result.fieldUpdatedAt["i:living-room:playlists"], undefined);
  assert.equal(value.iptvByProfile.kids.playlists[0].streamNetHostOverride, "https://remote.test");

  // Nothing left to remove: every account is already clean, so no change is reported.
  assert.equal(applyAdminGlobalMutation(result, mutation, 9000), null);
  assert.equal(applyAdminGlobalMutation(snapshot(), mutation, 9000), null);
});

test("single-account StreamNet host override removal honours the profile and reports missing setup", () => {
  const value = snapshot();
  const entry = (host) => ({
    id: "streamnet_tv", name: "StreamNet TV",
    m3uUrl: `${host}/get.php?username=u&password=p`, streamNetHostOverride: host,
  });
  value.iptvByProfile.kids.playlists = [entry("https://remote.test")];
  value.iptvByProfile["living-room"].playlists = [entry("https://remote.test")];

  const one = applyAdminSnapshotMutation(value, {
    operation: "clear_streamnet_host_override", profileId: "kids",
  }, 7000);
  assert.equal(Object.hasOwn(one.iptvByProfile.kids.playlists[0], "streamNetHostOverride"), false);
  assert.equal(one.iptvByProfile["living-room"].playlists[0].streamNetHostOverride, "https://remote.test");

  const all = applyAdminSnapshotMutation(value, { operation: "clear_streamnet_host_override" }, 7000);
  for (const id of ["kids", "living-room"]) {
    assert.equal(Object.hasOwn(all.iptvByProfile[id].playlists[0], "streamNetHostOverride"), false);
  }
  assert.equal(all.updatedAt, 7000);

  assert.throws(() => applyAdminSnapshotMutation(all, {
    operation: "clear_streamnet_host_override",
  }), /has no host override/);
  assert.throws(() => applyAdminSnapshotMutation(snapshot(), {
    operation: "clear_streamnet_host_override",
  }), /not configured for this account/);
  assert.throws(() => applyAdminSnapshotMutation(value, {
    operation: "clear_streamnet_host_override", profileId: "missing",
  }), /Unknown profile/);
});

test("upserts an account-wide addon with an initial state for every profile", () => {
  const result = applyAdminSnapshotMutation(
    snapshot(),
    {
      operation: "upsert_addon",
      data: {
        id: "example",
        name: "Example",
        url: "https://secret.example/manifest.json",
        manifest: addonManifest(),
      },
    },
    1234,
  );

  assert.equal(result.addonsUpdatedAt, 1234);
  assert.equal(result.updatedAt, 1234);
  const addon = result.addonsByProfile["living-room"][0];
  assert.equal(addon.id, "org.example.addon_c3dad99e9c79");
  assert.equal(addon.name, "Example");
  assert.equal(addon.version, "2.1.0");
  assert.equal(addon.isInstalled, true);
  assert.equal(addon.type, "CUSTOM");
  assert.equal(addon.logo, "https://example.test/logo.png");
  assert.equal(addon.manifest.resources[1].types[0], "movie");
  assert.equal(addon.manifest.catalogs[0].extra[0].name, "genre");
  assert.deepEqual(
    result.addonsByProfile.kids,
    result.addonsByProfile["living-room"],
  );
  assert.deepEqual(result.addons, result.addonsByProfile["living-room"]);
});

test("updates account-wide addon config without changing profile activation", () => {
  const value = snapshot();
  const existing = {
    id: "org.example.addon_c3dad99e9c79",
    name: "Old name",
    isEnabled: true,
  };
  value.addons = [existing];
  value.addonsByProfile["living-room"] = [existing];
  value.addonsByProfile.kids = [{ ...existing, isEnabled: false }];

  const result = applyAdminSnapshotMutation(value, {
    operation: "upsert_addon",
    data: {
      name: "Updated name",
      url: "https://secret.example/manifest.json",
      manifest: addonManifest(),
    },
  });

  assert.equal(result.addons[0].name, "Updated name");
  assert.equal(result.addonsByProfile["living-room"][0].isEnabled, true);
  assert.equal(result.addonsByProfile.kids[0].isEnabled, false);
});

test("hydrates remote Stremio addon links like Android settings installs", async () => {
  const hydrated = await hydrateAdminStremioAddon(
    {
      url: "stremio://torrentio.example/config/manifest.jsonv?token=abc#install",
    },
    async (url) => {
      assert.equal(
        url,
        "https://torrentio.example/config/manifest.json?token=abc",
      );
      return {
        ok: true,
        text: async () => JSON.stringify(addonManifest()),
      };
    },
  );

  const result = applyAdminSnapshotMutation(
    snapshot(),
    { operation: "upsert_addon", profileId: "kids", data: hydrated },
    2222,
  );

  const addon = result.addonsByProfile.kids[0];
  assert.equal(addon.id, "org.example.addon_64efb9b24896");
  assert.equal(addon.name, "Example Addon");
  assert.equal(
    addon.url,
    "https://torrentio.example/config/manifest.json?token=abc",
  );
  assert.equal(addon.transportUrl, "https://torrentio.example/config");
  assert.equal(addon.manifest.id, "org.example.addon");
  assert.equal(addon.manifest.behaviorHints.p2p, true);
  assert.equal(addon.runtimeKind, "STREMIO");
  assert.equal(addon.installSource, "DIRECT_URL");
});

test("requires a remote Stremio addon URL", () => {
  assert.throws(
    () =>
      applyAdminSnapshotMutation(snapshot(), {
        operation: "upsert_addon",
        profileId: "kids",
        data: { id: "empty", name: "Empty" },
      }),
    /Addon manifest URL is required/,
  );
});

test("applies small admin mutations to large existing snapshots", () => {
  const value = snapshot();
  value.largeGuideCache = "x".repeat(700 * 1024);

  const result = applyAdminSnapshotMutation(
    value,
    {
      operation: "set_profile_field",
      profileId: "kids",
      rootKey: "profileSettingsById",
      field: "liveTvLayoutMode",
      data: "classic",
    },
    1234,
  );

  assert.equal(result.profileSettingsById.kids.liveTvLayoutMode, "classic");
  assert.equal(result.fieldUpdatedAt["p:kids:liveTvLayoutMode"], 1234);
  assert.equal(result.largeGuideCache.length, 700 * 1024);
});

test("upserts a playlist only for the selected profile", () => {
  const result = applyAdminSnapshotMutation(
    snapshot(),
    {
      operation: "upsert_playlist",
      profileId: "kids",
      data: {
        id: "family-tv",
        name: "Family TV",
        m3uUrl: "https://provider.example/list.m3u",
      },
    },
    2345,
  );

  assert.equal(result.iptvByProfile.kids.playlists[0].id, "family-tv");
  assert.equal(result.iptvByProfile.kids.playlists[0].importVod, true);
  assert.equal(result.fieldUpdatedAt["i:kids:playlists"], 2345);
  assert.deepEqual(result.iptvByProfile["living-room"].playlists, []);
});

test("derives playlist id and name when admin only provides urls", () => {
  const result = applyAdminSnapshotMutation(
    snapshot(),
    {
      operation: "upsert_playlist",
      profileId: "kids",
      data: {
        m3uUrl: "https://provider.example/family-tv.m3u",
        epgUrl: "https://provider.example/guide.xml",
      },
    },
    2346,
  );

  const playlist = result.iptvByProfile.kids.playlists[0];
  assert.match(playlist.id, /^family-tv-[a-f0-9]{8}$/);
  assert.equal(playlist.name, "family tv");
  assert.equal(playlist.epgUrls[0], "https://provider.example/guide.xml");
  assert.equal(result.fieldUpdatedAt["i:kids:playlists"], 2346);
});

test("allows only bounded profile fields and rejects unknown profiles", () => {
  const result = applyAdminSnapshotMutation(
    snapshot(),
    {
      operation: "set_profile_field",
      profileId: "kids",
      rootKey: "iptvByProfile",
      field: "sortOrder",
      data: "name",
    },
    4321,
  );
  assert.equal(result.iptvByProfile.kids.sortOrder, "name");
  assert.equal(result.fieldUpdatedAt["i:kids:sortOrder"], 4321);

  assert.throws(
    () =>
      applyAdminSnapshotMutation(snapshot(), {
        operation: "set_profile_field",
        profileId: "missing",
        rootKey: "profileSettingsById",
        field: "accentColor",
        data: "Orange",
      }),
    /Unknown profile/,
  );
  assert.throws(
    () =>
      applyAdminSnapshotMutation(snapshot(), {
        operation: "set_profile_field",
        profileId: "kids",
        rootKey: "traktTokens",
        field: "accessToken",
        data: "nope",
      }),
    /not editable/,
  );
});

test("removes an addon from every profile it was shared with", () => {
  const value = snapshot();
  value.addons = [{ id: "example", name: "Stale legacy example" }];
  value.addonsByProfile["living-room"] = [{ id: "example", name: "Example" }];
  value.addonsByProfile.kids = [{ id: "example", name: "Example" }];
  const result = applyAdminSnapshotMutation(value, {
    operation: "delete_addon",
    data: { id: "example" },
  });

  assert.deepEqual(result.addons, []);
  assert.deepEqual(result.addonsByProfile["living-room"], []);
  assert.deepEqual(result.addonsByProfile.kids, []);
});

test("removes a playlist only from the selected profile", () => {
  const value = snapshot();
  value.iptvByProfile.kids.playlists.push({
    id: "family-tv",
    name: "Family TV",
    m3uUrl: "https://provider.example/list.m3u",
  });
  value.iptvByProfile.kids.m3uUrl = "https://provider.example/list.m3u";
  const result = applyAdminSnapshotMutation(
    value,
    {
      operation: "delete_playlist",
      profileId: "kids",
      data: { id: "family-tv" },
    },
    3456,
  );

  assert.deepEqual(result.iptvByProfile.kids.playlists, []);
  assert.equal(result.iptvByProfile.kids.m3uUrl, "");
  assert.equal(result.fieldUpdatedAt["i:kids:playlists"], 3456);
});

test("removes a profile and its scoped data, but keeps at least one profile", () => {
  const value = snapshot();
  const result = applyAdminSnapshotMutation(value, {
    operation: "delete_profile",
    profileId: "kids",
    data: {},
  });

  assert.deepEqual(
    result.profiles.map((profile) => profile.id),
    ["living-room"],
  );
  assert.equal(result.addonsByProfile.kids, undefined);
  assert.equal(result.watchlistByProfile.kids, undefined);

  assert.throws(
    () =>
      applyAdminSnapshotMutation(
        { profiles: [{ id: "solo", name: "Solo" }] },
        { operation: "delete_profile", profileId: "solo", data: {} },
      ),
    /Cannot delete the only profile/,
  );
});

test("edits the whole payload while preserving redacted secret values", () => {
  const value = snapshot();
  value.addons = [{ id: "opensubtitles", isEnabled: false }];
  value.addonsByProfile["living-room"] = [
    { id: "opensubtitles", isEnabled: true },
  ];
  value.addonsByProfile.kids = [{ id: "opensubtitles", isEnabled: false }];
  value.iptvByProfile.kids.m3uUrl = "https://user:pass@example/list.m3u";
  value.profiles[1].name = "Kids";

  const edited = JSON.parse(JSON.stringify(value));
  edited.addons[0].isEnabled = true;
  edited.profiles[1].name = "Kids Room";
  edited.iptvByProfile.kids.m3uUrl = "[REDACTED]";
  edited.iptvByProfile.kids.sortOrder = "name";

  const result = applyAdminSnapshotMutation(
    value,
    {
      operation: "edit_payload",
      data: edited,
    },
    5678,
  );

  assert.equal(result.addons[0].isEnabled, true);
  assert.equal(result.addonsByProfile.kids[0].isEnabled, false);
  assert.equal(result.addonsByProfile["living-room"][0].isEnabled, true);
  assert.equal(result.addonsUpdatedAt, 5678);
  assert.equal(result.profiles[1].name, "Kids Room");
  assert.equal(
    result.iptvByProfile.kids.m3uUrl,
    "https://user:pass@example/list.m3u",
  );
  assert.equal(result.iptvByProfile.kids.sortOrder, "name");
  assert.equal(result.fieldUpdatedAt["i:kids:sortOrder"], 5678);
});

test("rejects a payload edit that removes every profile", () => {
  assert.throws(
    () =>
      applyAdminSnapshotMutation(snapshot(), {
        operation: "edit_payload",
        data: { profiles: [] },
      }),
    /Payload must include at least one profile/,
  );
});

test("redacts credentials recursively while retaining useful structure", () => {
  const redacted = redactAdminPayload({
    profile: { name: "Kids", apiKey: "secret" },
    iptvByProfile: { kids: { m3uUrl: "https://user:pass@example/list" } },
  });

  assert.equal(redacted.profile.name, "Kids");
  assert.equal(redacted.profile.apiKey, "[REDACTED]");
  assert.equal(redacted.iptvByProfile.kids.m3uUrl, "[REDACTED]");
});

test("summarizes profile-scoped objects without exposing secrets", () => {
  const value = snapshot();
  value.iptvByProfile.kids.playlists.push({
    id: "family-tv",
    name: "Family TV",
    m3uUrl: "https://provider.example/list.m3u",
  });
  value.addonsByProfile.kids = [
    { id: "example", name: "Example", isEnabled: true },
  ];
  const summary = summarizeAdminPayload(value);

  assert.equal(summary.profileCount, 2);
  assert.equal(summary.playlistCount, 1);
  assert.equal(summary.profiles[1].watchlistCount, 1);
  assert.deepEqual(summary.profiles[1].playlists, [
    { id: "family-tv", name: "Family TV", enabled: true },
  ]);
  assert.deepEqual(summary.addons, [
    { id: "example", name: "Example", isEnabled: true },
  ]);
  assert.equal(
    summary.payload.iptvByProfile.kids.playlists[0].m3uUrl,
    "[REDACTED]",
  );
});
