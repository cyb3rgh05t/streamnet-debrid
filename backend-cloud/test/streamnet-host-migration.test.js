import assert from "node:assert/strict";
import test from "node:test";
import { hostnameOf, migrateStreamNetHost } from "../src/streamnet-host-migration.js";

function playlist(host) {
  const m3uUrl = `https://${host}/get.php?username=user&password=pass&type=m3u_plus&output=m3u8`;
  const epgUrl = `https://${host}/xmltv.php?username=user&password=pass`;
  return { id: "streamnet_tv", name: "StreamNet TV", m3uUrl, epgUrl, epgUrls: [epgUrl], enabled: true };
}

test("only profiles on the old host move, with credentials and the host override", () => {
  const payload = {
    profiles: [{ id: "old" }, { id: "current" }, { id: "empty" }],
    iptvByProfile: {
      old: { playlists: [playlist("xui.streamnet.live")], m3uUrl: playlist("xui.streamnet.live").m3uUrl },
      current: { playlists: [playlist("xyzxyz.streamnet.live")] },
      empty: { playlists: [{ id: "streamnet_tv", m3uUrl: "" }] },
    },
  };
  const result = migrateStreamNetHost(payload, hostnameOf("https://XUI.streamnet.live/"), "https://xyzxyz.streamnet.live", 5000);
  assert.deepEqual(result.profiles, ["old"]);
  const moved = result.payload.iptvByProfile.old;
  assert.match(moved.playlists[0].m3uUrl, /^https:\/\/xyzxyz\.streamnet\.live\/get\.php\?username=user&password=pass/);
  assert.equal(moved.m3uUrl, moved.playlists[0].m3uUrl);
  assert.equal(moved.playlists[0].streamNetHostOverride, "https://xyzxyz.streamnet.live");
  assert.equal(result.payload.streamNetHostOverridesByProfile.old, "https://xyzxyz.streamnet.live");
  assert.equal(result.payload.iptvByProfile.current.playlists[0].streamNetHostOverride, undefined);
  assert.equal(result.payload.iptvByProfile.empty.playlists[0].m3uUrl, "");
  // The input is not modified.
  assert.match(payload.iptvByProfile.old.playlists[0].m3uUrl, /xui\.streamnet\.live/);
});

test("accounts without a matching playlist are left alone", () => {
  const payload = {
    profiles: [{ id: "main" }],
    iptvByProfile: { main: { playlists: [playlist("xyzxyz.streamnet.live")] } },
  };
  assert.equal(migrateStreamNetHost(payload, "xui.streamnet.live", "https://xyzxyz.streamnet.live"), null);
});
