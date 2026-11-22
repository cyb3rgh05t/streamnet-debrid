const assert = require("node:assert/strict");
const test = require("node:test");
const { pathToFileURL } = require("node:url");
const path = require("node:path");

const moduleUrl = pathToFileURL(
  path.resolve(__dirname, "../lib/playlistOnboarding.ts"),
).href;

test("a profile without an enabled playlist needs the playlist setup", async () => {
  const { needsPlaylistSetup } = await import(moduleUrl);
  assert.equal(needsPlaylistSetup(undefined), true);
  assert.equal(needsPlaylistSetup([]), true);
  assert.equal(
    needsPlaylistSetup([{ id: "a", name: "A", m3uUrl: "  ", enabled: true }]),
    true,
  );
  assert.equal(
    needsPlaylistSetup([
      { id: "a", name: "A", m3uUrl: "http://x/get.php", enabled: false },
    ]),
    true,
  );
});

test("an enabled playlist with a URL skips the playlist setup", async () => {
  const { needsPlaylistSetup } = await import(moduleUrl);
  assert.equal(
    needsPlaylistSetup([
      { id: "a", name: "A", m3uUrl: "http://x/get.php", enabled: true },
    ]),
    false,
  );
});

test("the prompt key is scoped per account and profile", async () => {
  const { playlistPromptKey } = await import(moduleUrl);
  assert.notEqual(playlistPromptKey("u1", "p1"), playlistPromptKey("u2", "p1"));
  assert.notEqual(playlistPromptKey("u1", "p1"), playlistPromptKey("u1", "p2"));
  assert.match(playlistPromptKey(null, "p1"), /:local:p1$/);
});
