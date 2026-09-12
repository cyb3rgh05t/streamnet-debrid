const assert = require("node:assert/strict");
const test = require("node:test");
const { pathToFileURL } = require("node:url");
const path = require("node:path");

const moduleUrl = pathToFileURL(
  path.resolve(__dirname, "../lib/dateTime.ts"),
).href;

test("Web UI time formatter always uses a 24-hour clock", async () => {
  const { formatTime24Hour } = await import(moduleUrl);
  const timestamp = new Date("2026-09-12T23:05:00Z");
  const formatted = formatTime24Hour(timestamp, "en-US", { timeZone: "UTC" });

  assert.equal(formatted, "23:05");
  assert.doesNotMatch(formatted, /AM|PM/i);
});
