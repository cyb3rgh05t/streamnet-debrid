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
  // OLED and the AI subtitle options belong to the profile, so another profile keeps its own value.
  const oled = setField("oledBlackBackground", true);
  assert.equal(oled.profileSettingsById.main.oledBlackBackground, true);
  assert.equal(oled.fieldUpdatedAt["p:main:oledBlackBackground"], 1234);
  assert.equal(setField("subtitleAiModel", "GEMINI_FLASH_25").profileSettingsById.main.subtitleAiModel, "GEMINI_FLASH_25");
  assert.throws(() => setField("subtitleAiModel", "groq"), /unsupported value/);

  assert.throws(() => setField("subtitleSize", "Gigantic"), /unsupported value/);
  assert.throws(() => setField("trailerDelaySeconds", "5"), /unsupported value/);
  assert.throws(() => setField("autoPlayNext", "yes"), /true or false/);
});

test("fields outside the catalog still pass through unchanged", () => {
  assert.equal(setField("someFutureSetting", "x").profileSettingsById.main.someFutureSetting, "x");
});

test("account-wide settings are written at the top and stamped for the global merge", () => {
  const setAccount = (field, data) =>
    applyAdminSnapshotMutation(snapshot(), { operation: "set_account_setting", field, data }, 4321);
  const next = setAccount("dnsProvider", "google");
  assert.equal(next.dnsProvider, "google");
  assert.equal(next.fieldUpdatedAt["g:dnsProvider"], 4321);
  assert.equal(setAccount("skipProfileSelection", true).skipProfileSelection, true);

  assert.throws(() => setAccount("dnsProvider", "quad9"), /unsupported value/);
  assert.throws(() => setAccount("skipProfileSelection", "on"), /true or false/);
  // Per-profile settings and unknown names cannot be written through the account operation.
  assert.throws(() => setAccount("oledBlackBackground", true), /not an account-wide/);
  assert.throws(() => setAccount("subtitleAiEnabled", true), /not an account-wide/);
  assert.throws(() => setAccount("subtitleSize", "Large"), /not an account-wide/);
  assert.throws(() => setAccount("subtitleAiApiKey", "x"), /not an account-wide/);
});

test("language and region settings accept the values the app offers", () => {
  assert.equal(setField("contentLanguage", "en-US").profileSettingsById.main.contentLanguage, "en-US");
  assert.equal(setField("streamingRegion", "AT").profileSettingsById.main.streamingRegion, "AT");
  assert.equal(setField("streamingRegion", "auto").profileSettingsById.main.streamingRegion, "auto");
  assert.equal(setField("defaultAudioLanguage", "Portuguese (Brazil)").profileSettingsById.main.defaultAudioLanguage, "Portuguese (Brazil)");
  assert.throws(() => setField("streamingRegion", "ZZ"), /unsupported value/);
  assert.throws(() => setField("contentLanguage", "xx-XX"), /unsupported value/);
});