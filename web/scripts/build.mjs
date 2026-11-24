import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const env = { ...process.env };
const webPackage = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
);
const appGradleUrl = new URL("../../app/build.gradle.kts", import.meta.url);
const apkVersion = existsSync(appGradleUrl)
  ? readFileSync(appGradleUrl, "utf8").match(/versionName\s*=\s*"([^"]+)"/)?.[1]
  : undefined;
env.APK_VERSION = env.APK_VERSION || apkVersion || "";
if (!env.BUILD_STAMP) {
  const versionFile = new URL("../public/version.json", import.meta.url);
  const rawBuildStamp = existsSync(versionFile)
    ? String(JSON.parse(readFileSync(versionFile, "utf8")).v ?? "")
    : String(env.GITHUB_RUN_ID ?? Date.now());
  const parsedDate = Date.parse(rawBuildStamp);
  const buildStamp = /^\d+$/.test(rawBuildStamp)
    ? rawBuildStamp
    : Number.isFinite(parsedDate)
      ? String(parsedDate)
      : "";
  if (!buildStamp) {
    throw new Error(
      "public/version.json must contain a numeric build stamp in the v field.",
    );
  }
  writeFileSync(versionFile, `${JSON.stringify({ v: buildStamp })}\n`);
  env.BUILD_STAMP = buildStamp;
}
const result = spawnSync(
  process.execPath,
  [require.resolve("next/dist/bin/next"), "build"],
  { env, stdio: "inherit" },
);
if (result.error) throw result.error;
process.exit(result.status ?? 1);
