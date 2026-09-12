const assert = require("node:assert/strict");
const test = require("node:test");
const { pathToFileURL } = require("node:url");
const path = require("node:path");

const moduleUrl = pathToFileURL(
  path.resolve(__dirname, "../lib/streamnetTv.ts"),
).href;

test("StreamNet TV preset builds encoded M3U and EPG URLs", async () => {
  const { buildStreamNetTvPlaylist } = await import(moduleUrl);
  const playlist = buildStreamNetTvPlaylist(
    "https://xui.streamnet.live/",
    "user+name",
    "p@ss word",
  );

  assert.equal(playlist.id, "streamnet_tv");
  assert.equal(playlist.name, "STREAMNET TV");
  assert.equal(playlist.enabled, true);
  assert.equal(
    playlist.m3uUrl,
    "https://xui.streamnet.live/get.php?username=user%2Bname&password=p%40ss+word&type=m3u_plus&output=m3u8",
  );
  assert.equal(
    playlist.epgUrl,
    "https://xui.streamnet.live/xmltv.php?username=user%2Bname&password=p%40ss+word",
  );
});
