const assert = require("node:assert/strict");
const test = require("node:test");
const { pathToFileURL } = require("node:url");
const path = require("node:path");

const moduleUrl = pathToFileURL(
  path.resolve(__dirname, "../lib/iptvSession.ts"),
).href;

const channel = (id, cloudId) => ({ id, cloudId, name: id, group: "G" });
const channels = [channel("a", "pl:a"), channel("b", "pl:b"), channel("c", "pl:c")];

async function load() {
  const mod = await import(moduleUrl);
  return { ...mod, index: mod.channelIdentityIndex(channels) };
}

test("hidden channels resolve through cloud references and are dropped", async () => {
  const { applyChannelPreferences, hiddenChannelIdSet, index } = await load();
  const hidden = hiddenChannelIdSet(["pl:b", "unknown"], index);

  assert.deepEqual([...hidden], ["b"]);
  assert.deepEqual(
    applyChannelPreferences(channels, hidden, [], false, index).map((c) => c.id),
    ["a", "c"],
  );
});

test("ranked channels come first and unranked keep their order", async () => {
  const { applyChannelPreferences, index } = await load();
  const ordered = applyChannelPreferences(channels, new Set(), ["pl:c"], true, index);

  assert.deepEqual(ordered.map((c) => c.id), ["c", "a", "b"]);
  assert.deepEqual(
    applyChannelPreferences(channels, new Set(), ["pl:c"], false, index).map((c) => c.id),
    ["a", "b", "c"],
  );
});

test("moving a channel re-ranks the channels up to its position at the front", async () => {
  const { reorderChannelOrder } = await load();
  const visible = ["pl:a", "pl:b", "pl:c", "pl:d"];

  assert.deepEqual(reorderChannelOrder(["x"], visible, "pl:c", "top"), ["pl:c", "x"]);
  assert.deepEqual(reorderChannelOrder(["x"], visible, "pl:c", "up"), ["pl:a", "pl:c", "pl:b", "x"]);
  assert.deepEqual(reorderChannelOrder(["x"], visible, "pl:b", "down"), ["pl:a", "pl:c", "pl:b", "x"]);
  assert.deepEqual(reorderChannelOrder(["x"], visible, "pl:a", "up"), ["x"]);
  assert.deepEqual(reorderChannelOrder(["x"], visible, "missing", "top"), ["x"]);
});
