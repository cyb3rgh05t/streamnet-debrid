const routeActions = new Map([
  ["GET /health", "Health check"],
  ["GET /watch-history", "Watch history loaded"],
  ["POST /watch-history", "Watch progress saved"],
  ["DELETE /watch-history", "Watch history removed"],
  ["POST /auth-login", "Account sign-in"],
  ["POST /cloud-auth-email", "Account created"],
  ["POST /auth-refresh", "Session refreshed"],
  ["POST /app-usage-event", "App usage recorded"],
  ["POST /account-sync-pull", "Cloud snapshot loaded"],
  ["POST /account-sync-push", "Cloud snapshot saved"],
  ["POST /account-delete-start", "Account deletion started"],
  ["POST /account-delete-status", "Account deletion checked"],
  ["POST /tv-auth-start", "Device pairing started"],
  ["POST /tv-auth-status", "Device pairing checked"],
  ["POST /tv-auth-poll", "Device pairing checked"],
  ["POST /tv-auth-complete", "Device pairing completed"],
  ["POST /tv-auth-web", "Device pairing completed"],
  ["POST /admin-api/login", "Admin sign-in"],
  ["GET /admin-api/overview", "Admin overview loaded"],
  ["GET /admin-api/accounts", "Admin account list loaded"],
  ["GET /admin-api/accounts/:accountId", "Admin account loaded"],
  ["PATCH /admin-api/accounts/:accountId/snapshot", "Admin snapshot updated"],
  ["GET /admin-api/audits", "Admin audit loaded"],
]);

function envFlag(name, fallback) {
  const value = process.env[name]?.trim().toLowerCase();
  if (!value) return fallback;
  return value === "1" || value === "true" || value === "yes";
}

export function backendLoggerOptions() {
  const pretty = envFlag("LOG_PRETTY", true);
  const level = process.env.LOG_LEVEL?.trim() || "info";
  const logFile = process.env.LOG_FILE?.trim();
  if (!logFile && !pretty) return { level };

  return {
    level,
    transport: {
      targets: [
        pretty
          ? {
              target: "pino-pretty",
              level,
              options: {
                colorize: envFlag("LOG_COLOR", true),
                colorizeObjects: false,
                destination: 1,
                ignore:
                  "pid,hostname,requestId,method,path,statusCode,statusLabel,durationMs,durationLabel",
                messageFormat:
                  "{method} {path}  {statusLabel}  {durationLabel}  {msg}",
                singleLine: true,
                translateTime: "dd.mm.yyyy HH:MM:ss",
              },
            }
          : {
              target: "pino/file",
              level,
              options: { destination: 1 },
            },
        ...(logFile
          ? [
              {
                target: "pino-roll",
                level,
                options: {
                  file: logFile,
                  frequency: process.env.LOG_FILE_FREQUENCY?.trim() || "daily",
                  size: process.env.LOG_FILE_MAX_SIZE?.trim() || "10m",
                  mkdir: true,
                  limit: {
                    count: Number(process.env.LOG_FILE_RETAINED_COUNT || 14),
                  },
                },
              },
            ]
          : []),
      ],
    },
  };
}

export function requestLogDetails(request, reply, elapsedMs) {
  const method = request.method;
  const path = request.routeOptions?.url || request.url.split("?", 1)[0];
  const statusCode = reply.statusCode;
  const routeKey = `${method} ${path}`;
  const action = routeActions.get(routeKey) || "Request completed";
  const requestedDeviceType = String(request.body?.device_type || "")
    .trim()
    .toLowerCase();
  const deviceType = new Set(["phone", "tablet", "tv", "web"]).has(
    requestedDeviceType,
  )
    ? requestedDeviceType
    : "";
  const describedAction = deviceType ? `${action} (${deviceType})` : action;
  const level =
    statusCode >= 500 ? "error" : statusCode >= 400 ? "warn" : "info";
  const message =
    routeKey === "POST /auth-refresh" && statusCode === 401
      ? "Session refresh rejected"
      : action === "Request completed" && statusCode >= 400
        ? "Request failed"
        : statusCode >= 400
          ? `${describedAction} failed`
          : describedAction;

  return {
    level,
    message,
    fields: {
      method,
      path,
      statusCode,
      statusLabel: statusCode < 400 ? `OK ${statusCode}` : `HTTP ${statusCode}`,
      durationMs: Number(elapsedMs.toFixed(1)),
      durationLabel: `${elapsedMs.toFixed(1)} ms`,
      requestId: request.id,
      ...(deviceType ? { deviceType } : {}),
    },
  };
}

export function registerRequestLogging(app) {
  app.addHook("onRequest", async (request) => {
    request.backendStartedAt = process.hrtime.bigint();
  });

  app.addHook("onResponse", async (request, reply) => {
    const startedAt = request.backendStartedAt || process.hrtime.bigint();
    const elapsedMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    const { level, message, fields } = requestLogDetails(
      request,
      reply,
      elapsedMs,
    );
    request.log[level](fields, message);
  });
}
