const assert = require("node:assert/strict");
const test = require("node:test");
const { pathToFileURL } = require("node:url");
const path = require("node:path");

const moduleUrl = pathToFileURL(
  path.resolve(__dirname, "../lib/cloud.ts"),
).href;

test("an empty Android home server value clears the web home servers", async () => {
  const { settingsFromAndroidProfile } = await import(moduleUrl);

  assert.deepEqual(
    settingsFromAndroidProfile({ homeServerConnectionJson: "" }),
    { homeServers: [] },
  );
});

test("an Android home server value still maps to web settings", async () => {
  const { settingsFromAndroidProfile } = await import(moduleUrl);

  assert.deepEqual(
    settingsFromAndroidProfile({
      homeServerConnectionJson: JSON.stringify({
        connections: [
          {
            connectionId: "server-1",
            serverKind: "JELLYFIN",
            serverUrl: "https://media.example",
            serverName: "Media",
            accessToken: "token",
          },
        ],
      }),
    }).homeServers,
    [
      {
        id: "server-1",
        type: "jellyfin",
        name: "Media",
        url: "https://media.example",
        token: "token",
        username: undefined,
        password: undefined,
        enabled: true,
        serverId: undefined,
        userId: undefined,
        userName: undefined,
        accountToken: undefined,
        collections: undefined,
        lastConnectedAt: undefined,
      },
    ],
  );
});
