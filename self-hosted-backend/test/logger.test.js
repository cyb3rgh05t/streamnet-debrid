import assert from "node:assert/strict";
import test from "node:test";
import { backendLoggerOptions, requestLogDetails } from "../src/logger.js";

function request(method, url, routeUrl) {
  return {
    id: "req-1",
    method,
    url,
    routeOptions: routeUrl ? { url: routeUrl } : undefined,
  };
}

test("describes successful sync pulls without logging query values", () => {
  const details = requestLogDetails(
    request("POST", "/account-sync-pull?token=secret", "/account-sync-pull"),
    { statusCode: 200 },
    8.858,
  );

  assert.equal(details.level, "info");
  assert.equal(details.message, "Cloud snapshot loaded");
  assert.equal(details.fields.path, "/account-sync-pull");
  assert.equal(details.fields.statusLabel, "OK 200");
  assert.equal(details.fields.durationLabel, "8.9 ms");
});

test("highlights rejected refresh attempts as warnings", () => {
  const details = requestLogDetails(
    request("POST", "/auth-refresh", "/auth-refresh"),
    { statusCode: 401 },
    2.1,
  );

  assert.equal(details.level, "warn");
  assert.equal(details.message, "Session refresh rejected");
  assert.equal(details.fields.statusLabel, "HTTP 401");
});

test("highlights server failures as errors", () => {
  const details = requestLogDetails(
    request("GET", "/unknown?profile_id=private"),
    { statusCode: 500 },
    12,
  );

  assert.equal(details.level, "error");
  assert.equal(details.fields.path, "/unknown");
  assert.equal(details.message, "Request failed");
});

test("adds a rotating file target when LOG_FILE is configured", () => {
  const previousLogFile = process.env.LOG_FILE;
  process.env.LOG_FILE = "/app/logs/backend.log";
  try {
    const options = backendLoggerOptions();
    const fileTarget = options.transport.targets.find(
      (target) => target.target === "pino-roll",
    );

    assert.equal(fileTarget.options.file, "/app/logs/backend.log");
    assert.equal(fileTarget.options.frequency, "daily");
    assert.equal(fileTarget.options.size, "10m");
    assert.equal(fileTarget.options.limit.count, 14);
  } finally {
    if (previousLogFile === undefined) delete process.env.LOG_FILE;
    else process.env.LOG_FILE = previousLogFile;
  }
});
