const { json, options } = require("./_backend");
const { premiumFunnelReport } = require("./_premium-funnel");

exports.handler = async (event) => {
  const cors = options(event);
  if (cors) return cors;
  if (event.httpMethod !== "GET") return json(405, { error: "method_not_allowed" });
  const secret = process.env.ADMIN_SECRET || "";
  if (!secret || event.headers["x-admin-secret"] !== secret) {
    return json(401, { error: "unauthorized" });
  }
  try {
    const days = event.queryStringParameters?.days ||
      new URLSearchParams(event.rawQuery || event.rawQueryString || "").get("days") || 30;
    return json(200, await premiumFunnelReport(event, days));
  } catch (error) {
    console.error("premium-funnel-report failed", error);
    return json(500, { error: "premium_report_failed" });
  }
};
