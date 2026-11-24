import assert from "node:assert/strict";
import test from "node:test";
import { applyAdminSnapshotMutation } from "../src/admin-snapshots.js";
import { profileSettingGroups, validateProfileSettingValue } from "../src/profile-settings-catalog.js";

const snapshot = () => ({ profiles: [{ id: "main" }], profileSettingsById: { main: { autoPlayNext: true } } });
const setField = (field, data) =>
  applyAdminSnapshotMutation(snapshot(), {
    operation: "set_profile_field", profileId: "main", rootKey: "profileSettingsById", field, data,
  }, 1234);

test("every catalog default is one of its own choices", () => {
  for (const { settings } of profileSettingGroups) {
    for (const setting of settings) {
      assert.doesNotThrow(() => validateProfileSettingValue(setting.field, setting.default), setting.field);
    }
  }
});

test("remote setting changes accept only values the app knows", () => {
  const next = setField("subtitleSize", "Large");
  assert.equal(next.profileSettingsById.main.subtitleSize, "Large");
  assert.equal(next.fieldUpdatedAt["p:main:subtitleSize"], 1234);
  assert.equal(setField("trailerDelaySeconds", 5).profileSettingsById.main.trailerDelaySeconds, 5);
  assert.equal(setField("autoPlayNext", false).profileSettingsById.main.autoPlayNext, false);

  assert.throws(() => setField("subtitleSize", "Gigantic"), /unsupported value/);
  assert.throws(() => setField("trailerDelaySeconds", "5"), /unsupported value/);
  assert.throws(() => setField("autoPlayNext", "yes"), /true or false/);
});

test("fields outside the catalog still pass through unchanged", () => {
  assert.equal(setField("someFutureSetting", "x").profileSettingsById.main.someFutureSetting, "x");
});
