import assert from "node:assert/strict";
import test from "node:test";
import { applyAdminSnapshotMutation, orphanProfileData, summarizeAdminPayload } from "../src/admin-snapshots.js";

const payload = () => ({
  profiles: [{ id: "main", name: "Main" }, { id: "kids", name: "Kids" }],
  activeProfileId: "kids",
  profileSettingsById: { main: { a: 1 }, kids: { a: 2 } },
  localContinueWatchingByProfile: { main: [{ id: 1 }], kids: [{ id: 2 }] },
  dismissedContinueWatchingByProfile: { kids: "movie:2,5" },
  traktTokens: { kids: { accessToken: "x" } },
  profileAvatarImagesById: { kids: "img" },
  fieldUpdatedAt: { "p:main:a": 1, "p:kids:a": 2, "i:kids:playlists": 3, "g:dnsProvider": 4 },
});

test("deleting a profile removes every trace of it and leaves a deletion marker for the apps", () => {
  const next = applyAdminSnapshotMutation(payload(), { operation: "delete_profile", profileId: "kids" }, 777);
  assert.deepEqual(next.profiles.map((profile) => profile.id), ["main"]);
  assert.deepEqual(Object.keys(next.localContinueWatchingByProfile), ["main"]);
  assert.equal(next.dismissedContinueWatchingByProfile.kids, undefined);
  assert.equal(next.traktTokens.kids, undefined);
  assert.equal(next.profileAvatarImagesById.kids, undefined);
  assert.deepEqual(Object.keys(next.fieldUpdatedAt).sort(), ["g:dnsProvider", "p:main:a"]);
  assert.equal(next.profileDeletedAtById.kids, 777);
  assert.equal(next.activeProfileId, "main");
  // The profile that stays is untouched.
  assert.deepEqual(next.profileSettingsById.main, { a: 1 });
});

test("the last profile cannot be deleted", () => {
  const single = { profiles: [{ id: "main" }] };
  assert.throws(() => applyAdminSnapshotMutation(single, { operation: "delete_profile", profileId: "main" }), /only profile/);
});

test("orphaned profile data is found and removed on request, never the data of existing profiles", () => {
  const leftovers = {
    ...payload(),
    localContinueWatchingByProfile: { main: [{ id: 1 }], gone: [{ id: 9 }] },
    iptvByProfile: { main: {}, gone: {} },
    profileDeletedAtById: { gone: 50 },
    fieldUpdatedAt: { "p:main:a": 1, "p:gone:a": 2, "i:gone:m3uUrl": 3, "g:dnsProvider": 4 },
  };
  assert.deepEqual(orphanProfileData(leftovers), [{ id: "gone", items: 4 }]);
  assert.deepEqual(summarizeAdminPayload(leftovers).orphanProfiles, [{ id: "gone", items: 4 }]);

  const cleaned = applyAdminSnapshotMutation(leftovers, { operation: "cleanup_orphan_profiles" }, 1);
  assert.deepEqual(Object.keys(cleaned.localContinueWatchingByProfile), ["main"]);
  assert.deepEqual(Object.keys(cleaned.iptvByProfile), ["main"]);
  assert.deepEqual(Object.keys(cleaned.fieldUpdatedAt).sort(), ["g:dnsProvider", "p:main:a"]);
  assert.equal(cleaned.profileDeletedAtById.gone, 50, "existing deletion markers stay");
  assert.deepEqual(cleaned.profiles.map((profile) => profile.id), ["main", "kids"]);
  assert.equal(cleaned.profileSettingsById.kids.a, 2);
  assert.throws(() => applyAdminSnapshotMutation(cleaned, { operation: "cleanup_orphan_profiles" }), /No orphaned profile data/);
});

test("without any profile nothing counts as orphaned", () => {
  assert.deepEqual(orphanProfileData({ profiles: [], iptvByProfile: { x: {} } }), []);
});
