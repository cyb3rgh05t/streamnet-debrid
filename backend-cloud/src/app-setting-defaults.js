import { normalizeAppSettings } from "./profile-settings-catalog.js";

// Default app settings for accounts that do not exist yet, kept in the central catalog_config table.
export const appSettingDefaultsId = "app-setting-defaults";

/** Stored defaults; unknown or no longer valid fields are dropped instead of failing every new account. */
export async function readAppSettingDefaults(pool) {
  const result = await pool
    .query("select payload, updated_at from catalog_config where id = $1", [appSettingDefaultsId])
    .catch((error) => {
      // Before migration 014 ran there is no table: no defaults.
      if (error?.code === "42P01") return { rows: [] };
      throw error;
    });
  const row = result.rows[0];
  const stored = row?.payload?.settings;
  const settings = {};
  if (stored && typeof stored === "object" && !Array.isArray(stored)) {
    for (const [field, value] of Object.entries(stored)) {
      try {
        Object.assign(settings, normalizeAppSettings({ [field]: value }));
      } catch {
        // Dropped.
      }
    }
  }
  return { settings, updatedAt: row ? new Date(row.updated_at).toISOString() : null };
}
