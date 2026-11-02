import assert from "node:assert/strict";
import test from "node:test";
import {
  applyAdminGlobalMutation,
  applyAdminSnapshotMutation,
  prepareAdminGlobalMutation,
} from "../src/admin-snapshots.js";
import { mergePushPayloadByFieldTimestamps } from "../src/snapshots.js";

function snapshot() {
  const playlist = {
    id: "streamnet_tv", name: "StreamNet TV",
    m3uUrl: "https://built-in.test/get.php?username=user&password=pass&type=m3u_plus&output=m3u8",
    epgUrl: "https://built-in.test/xmltv.php?username=user&password=pass",
    enabled: true, importVod: true,
    expiresAtEpochSeconds: 100, expirationCheckedAtMillis: 1000,
  };
  playlist.epgUrls = [playlist.epgUrl];
  return {
    profiles: [{ id: "main" }, { id: "kids" }],
    iptvByProfile: {
      main: {
        playlists: [playlist, { id: "custom", m3uUrl: "https://custom.test/list.m3u" }],
        m3uUrl: playlist.m3uUrl, epgUrl: playlist.epgUrl, epgUrls: playlist.epgUrls,
      },
      kids: { playlists: [structuredClone(playlist)] },
    },
    fieldUpdatedAt: { "i:main:playlists": 1000 },
  };
}

function setHost(value, host = "https://admin.test/base") {
  return applyAdminSnapshotMutation(value, {
    operation: "change_streamnet_host", profileId: "main", data: { host },
  }, 2000);
}

function push(incoming, current, time = 3000) {
  incoming.fieldUpdatedAt["i:main:playlists"] = time;
  incoming.fieldUpdatedAt["i:main:m3uUrl"] = time;
  incoming.fieldUpdatedAt["i:main:epgUrl"] = time;
  incoming.fieldUpdatedAt["i:main:epgUrls"] = time;
  return mergePushPayloadByFieldTimestamps(incoming, current);
}

test("later account-expiration refresh cannot overwrite the admin host", () => {
  const initial = snapshot();
  const current = setHost(initial);
  const incoming = structuredClone(initial);
  incoming.iptvByProfile.main.playlists[0].expirationCheckedAtMillis = 3000;
  incoming.iptvByProfile.main.playlists[0].expiresAtEpochSeconds = 500;
  incoming.iptvByProfile.main.playlists[0].enabled = false;
  incoming.iptvByProfile.main.playlists[0].importVod = false;
  const merged = push(incoming, current);
  const playlist = merged.iptvByProfile.main.playlists[0];
  assert.equal(playlist.streamNetHostOverride, "https://admin.test/base");
  assert.equal(new URL(playlist.m3uUrl).origin, "https://admin.test");
  assert.equal(new URL(playlist.m3uUrl).pathname, "/base/get.php");
  assert.equal(new URL(playlist.epgUrl).pathname, "/base/xmltv.php");
  assert.equal(new URL(playlist.m3uUrl).searchParams.get("output"), "m3u8");
  assert.deepEqual(playlist.epgUrls, [playlist.epgUrl]);
  assert.equal(playlist.enabled, false);
  assert.equal(playlist.importVod, false);
  assert.equal(playlist.expirationCheckedAtMillis, 0);
  assert.equal(merged.iptvByProfile.main.m3uUrl, playlist.m3uUrl);
  assert.equal(merged.iptvByProfile.main.epgUrl, playlist.epgUrl);
  assert.deepEqual(merged.iptvByProfile.main.epgUrls, playlist.epgUrls);
  assert.deepEqual(merged.iptvByProfile.kids, initial.iptvByProfile.kids);
  assert.deepEqual(merged.iptvByProfile.main.playlists[1], initial.iptvByProfile.main.playlists[1]);
  assert.equal(incoming.iptvByProfile.main.playlists[0].streamNetHostOverride, undefined);
  assert.equal(current.iptvByProfile.main.playlists[0].enabled, true);
});

test("re-login syncs new credentials while retaining the admin server", () => {
  const incoming = snapshot();
  const playlist = incoming.iptvByProfile.main.playlists[0];
  playlist.m3uUrl = "https://built-in.test new-user new-password";
  playlist.epgUrl = playlist.m3uUrl;
  incoming.iptvByProfile.main.m3uUrl = playlist.m3uUrl;
  incoming.iptvByProfile.main.epgUrl = playlist.epgUrl;
  const merged = push(incoming, setHost(snapshot()));
  const selected = merged.iptvByProfile.main.playlists[0];
  assert.equal(new URL(selected.m3uUrl).searchParams.get("username"), "new-user");
  assert.equal(new URL(selected.epgUrl).searchParams.get("password"), "new-password");
  assert.equal(new URL(selected.m3uUrl).host, "admin.test");
});

test("latest admin change survives a later push carrying the previous override", () => {
  const first = setHost(snapshot());
  const second = setHost(first, "https://second.test:8443/tv");
  const incoming = structuredClone(first);
  const result = push(incoming, second, Number.MAX_SAFE_INTEGER);
  assert.equal(result.iptvByProfile.main.playlists[0].streamNetHostOverride, "https://second.test:8443/tv");
  assert.equal(new URL(result.iptvByProfile.main.playlists[0].m3uUrl).pathname, "/tv/get.php");
  assert.equal(result.streamNetHostOverridesByProfile.main, "https://second.test:8443/tv");
});

test("explicit reset cannot be undone by stale devices or their copies of server metadata", () => {
  const first = setHost(snapshot());
  const cleared = applyAdminSnapshotMutation(first, {
    operation: "clear_streamnet_host_override", profileId: "main",
  }, 4000);
  assert.equal(cleared.streamNetHostOverridesByProfile.main, "");
  const merged = push(structuredClone(first), cleared, 5000);
  assert.equal(Object.hasOwn(merged.iptvByProfile.main.playlists[0], "streamNetHostOverride"), false);
  assert.equal(merged.streamNetHostOverridesByProfile.main, "");
  const secondPush = push(structuredClone(first), merged, 6000);
  assert.equal(Object.hasOwn(secondPush.iptvByProfile.main.playlists[0], "streamNetHostOverride"), false);
  const reconfigured = setHost(secondPush, "https://third.test");
  assert.equal(reconfigured.streamNetHostOverridesByProfile.main, "https://third.test");
  assert.equal(push(structuredClone(first), reconfigured, 7000)
    .iptvByProfile.main.playlists[0].streamNetHostOverride, "https://third.test");
});

test("existing overrides without server metadata are adopted on push", () => {
  const current = setHost(snapshot());
  delete current.streamNetHostOverridesByProfile;
  const merged = push(snapshot(), current);
  assert.equal(merged.iptvByProfile.main.playlists[0].streamNetHostOverride, "https://admin.test/base");
  assert.equal(merged.streamNetHostOverridesByProfile.main, "https://admin.test/base");
});

test("global host and reset actions maintain independent profile policies", () => {
  const configured = applyAdminGlobalMutation(snapshot(), prepareAdminGlobalMutation({
    operation: "change_xtream_host", targetId: "streamnet_tv", data: { host: "https://global.test" },
  }), 2000);
  assert.deepEqual(configured.streamNetHostOverridesByProfile, {
    main: "https://global.test", kids: "https://global.test",
  });
  const reset = applyAdminGlobalMutation(configured, prepareAdminGlobalMutation({
    operation: "clear_streamnet_host_override",
  }), 4000);
  assert.deepEqual(reset.streamNetHostOverridesByProfile, { main: "", kids: "" });
});

test("raw admin payload edits also update and reset the authoritative override", () => {
  const current = setHost(snapshot());
  const edited = structuredClone(current);
  edited.iptvByProfile.main.playlists[0].streamNetHostOverride = "https://raw.test";
  const result = applyAdminSnapshotMutation(current, { operation: "edit_payload", data: edited }, 5000);
  assert.equal(result.streamNetHostOverridesByProfile.main, "https://raw.test");
  const cleared = structuredClone(result);
  delete cleared.iptvByProfile.main.playlists[0].streamNetHostOverride;
  const reset = applyAdminSnapshotMutation(result, { operation: "edit_payload", data: cleared }, 6000);
  assert.equal(reset.streamNetHostOverridesByProfile.main, "");
});

test("admin playlist replacement updates policy and unrelated mutations preserve it", () => {
  const current = setHost(snapshot());
  const playlist = structuredClone(current.iptvByProfile.main.playlists[0]);
  playlist.streamNetHostOverride = "https://replacement.test";
  const changed = applyAdminSnapshotMutation(current, {
    operation: "upsert_playlist", profileId: "main", data: playlist,
  }, 4000);
  assert.equal(changed.streamNetHostOverridesByProfile.main, "https://replacement.test");
  const options = applyAdminSnapshotMutation(changed, {
    operation: "set_profile_field", profileId: "main",
    rootKey: "iptvByProfile", field: "sortOrder", data: "name",
  }, 5000);
  assert.deepEqual(options.streamNetHostOverridesByProfile, changed.streamNetHostOverridesByProfile);
});

test("correctly routed pushes retain account expiration metadata", () => {
  const current = setHost(snapshot());
  const incoming = structuredClone(current);
  incoming.iptvByProfile.main.playlists[0].expirationCheckedAtMillis = 3000;
  incoming.iptvByProfile.main.playlists[0].expiresAtEpochSeconds = 9000;
  const result = push(incoming, current);
  assert.equal(result.iptvByProfile.main.playlists[0].expirationCheckedAtMillis, 3000);
  assert.equal(result.iptvByProfile.main.playlists[0].expiresAtEpochSeconds, 9000);
});

test("blank presets and deleted playlists are not repopulated with old credentials", () => {
  const current = setHost(snapshot());
  const incoming = snapshot();
  incoming.iptvByProfile.main.playlists[0].m3uUrl = "";
  const blank = push(incoming, current);
  assert.equal(blank.iptvByProfile.main.playlists[0].m3uUrl, "");
  assert.equal(blank.iptvByProfile.main.playlists[0].streamNetHostOverride, "https://admin.test/base");
  incoming.iptvByProfile.main.playlists = [];
  assert.deepEqual(push(incoming, current).iptvByProfile.main.playlists, []);
});

test("unmanaged playlists retain normal sync and client-supplied policy maps are ignored", () => {
  const incoming = snapshot();
  incoming.streamNetHostOverridesByProfile = { main: "https://client.test" };
  const merged = push(incoming, snapshot());
  assert.deepEqual(merged.iptvByProfile, incoming.iptvByProfile);
  assert.equal(merged.streamNetHostOverridesByProfile, undefined);
  assert.equal(mergePushPayloadByFieldTimestamps(incoming, null).streamNetHostOverridesByProfile, undefined);
});

test("deleted profiles lose their policy and are not resurrected by later pushes", () => {
  const current = setHost(snapshot());
  const incoming = snapshot();
  incoming.profiles = [{ id: "kids" }];
  delete incoming.iptvByProfile.main;
  const result = push(incoming, current);
  assert.equal(result.streamNetHostOverridesByProfile, undefined);
});
