export const presenceTimeoutSeconds = 90;

export function registerPresenceRoutes(app, { pool, authenticatedAccount }) {
  app.post("/device-presence", {
    bodyLimit: 4096,
    schema: {
      body: {
        type: "object",
        additionalProperties: false,
        required: ["install_id", "platform", "device_type"],
        properties: {
          install_id: { type: "string", minLength: 1, maxLength: 200, pattern: "^[a-zA-Z0-9_-]+$" },
          profile_id: { type: ["string", "null"], maxLength: 200 },
          platform: { type: "string", enum: ["android", "web"] },
          device_type: { type: "string", minLength: 1, maxLength: 40 },
          app_version: { type: "string", maxLength: 80 },
          app_version_code: { type: ["integer", "null"], minimum: 0 },
          distribution: { type: "string", maxLength: 40 },
        },
      },
    },
  }, async (request, reply) => {
    reply.header("Cache-Control", "no-store");
    const account = await authenticatedAccount(request);
    const body = request.body;
    await pool.query(
      `insert into device_presence
         (account_id, install_id, profile_id, platform, device_type,
          app_version, app_version_code, distribution, last_seen)
       values ($1, $2, $3, $4, $5, $6, $7, $8, now())
       on conflict (account_id, install_id) do update set
         profile_id = excluded.profile_id, platform = excluded.platform,
         device_type = excluded.device_type, app_version = excluded.app_version,
         app_version_code = excluded.app_version_code,
         distribution = excluded.distribution, last_seen = now()`,
      [account.id, body.install_id, body.profile_id || null, body.platform,
        body.device_type, body.app_version || null, body.app_version_code ?? null,
        body.distribution || null],
    );
    return { ok: true, expires_in: presenceTimeoutSeconds };
  });
}
