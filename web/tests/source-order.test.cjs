const assert = require("node:assert/strict");
const test = require("node:test");
const { pathToFileURL } = require("node:url");
const path = require("node:path");

const moduleUrl = pathToFileURL(
  path.resolve(__dirname, "../lib/sourceRank.ts"),
).href;

test("NZB manual pickers keep Smart Play first and original release order for both targets", async () => {
  const { compareSourcePickerOrder, restoreNzbSourceOrder } = await import(moduleUrl);
  const nzb = (order, source) => ({
    addonId: "com.usenet.streamer", addonName: "StreamNet NZB", source,
    addonSourceOrder: order, quality: "1080p", url: "https://example.test/release",
  });
  const smart = { ...nzb(0, "Smart Play"), quality: "HD", behaviorHints: { notWebReady: true } };
  const preferred = nzb(1, "German HEVC WEBRip");
  const larger = { ...nzb(2, "German AVC BluRay"), size: "23 GB" };
  const other = { ...nzb(0, "Other"), addonId: "other", addonName: "Other" };
  assert.deepEqual(restoreNzbSourceOrder([larger, other, smart, preferred]),
    [smart, other, preferred, larger]);
  for (const target of ["browser", "external"]) {
    assert.deepEqual([larger, preferred, smart].sort((a, b) =>
      compareSourcePickerOrder(a, b, new Map(), target)), [smart, preferred, larger]);
  }
});

test("source picker prioritizes addon order over quality and IPTV VOD first", async () => {
  const { compareSourcePickerOrder } = await import(moduleUrl);
  const addonOrder = new Map([
    ["first-addon", 0],
    ["second-addon", 1],
  ]);
  const firstAddonStream = {
    addonId: "first-addon",
    quality: "720p",
    source: "WEB-DL",
    url: "https://media.example/first.mkv",
  };
  const secondAddonStream = {
    addonId: "second-addon",
    quality: "2160p 4K",
    source: "BluRay REMUX",
    url: "https://media.example/second.mkv",
  };
  const iptvVodStream = {
    addonId: "iptv_xtream_vod",
    quality: "480p",
    source: "IPTV VOD",
    url: "https://media.example/iptv.mp4",
  };

  assert.ok(
    compareSourcePickerOrder(firstAddonStream, secondAddonStream, addonOrder) <
      0,
  );
  assert.ok(
    compareSourcePickerOrder(iptvVodStream, firstAddonStream, addonOrder) < 0,
  );
});
