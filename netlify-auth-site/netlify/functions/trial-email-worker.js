const { json } = require("./_backend");
const { runDueTrialEmails } = require("./_trial-emails");
const { cleanupPremiumFunnel } = require("./_premium-funnel");

exports.handler = async (event) => {
  try {
    const emailResult = await runDueTrialEmails(event);
    const funnelEventsDeleted = await cleanupPremiumFunnel(event, 90);
    return json(200, { ok: true, ...emailResult, funnel_events_deleted: funnelEventsDeleted });
  } catch (error) {
    console.error("trial-email-worker failed", error);
    return json(500, { error: "trial_email_worker_failed" });
  }
};

exports.config = { schedule: "*/30 * * * *" };
