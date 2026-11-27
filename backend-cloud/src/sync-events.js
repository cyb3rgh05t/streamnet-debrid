// Events sent to the devices of an account over /account-sync-events.
//   snapshot       the account snapshot changed: clients download it.
//   watch_history  only a Continue Watching row changed: clients refresh just that list and never
//                  download the snapshot. Clients that do not know `kind` keep treating every event as a snapshot change.
export const syncEventKinds = Object.freeze({ snapshot: "snapshot", watchHistory: "watch_history" });

/** A device id is only used to recognise the sender's own echo, so keep it short and printable. */
export function normalizeSourceDeviceId(value) {
  const id = Array.isArray(value) ? value[0] : value;
  if (typeof id !== "string") return null;
  const trimmed = id.trim();
  return /^[\w.:-]{1,128}$/.test(trimmed) ? trimmed : null;
}

export function buildAccountSyncEvent({ revision, sourceDeviceId = null, kind = syncEventKinds.snapshot, now = new Date() }) {
  return {
    type: "account_sync_revision",
    revision,
    sourceDeviceId: normalizeSourceDeviceId(sourceDeviceId),
    kind,
    changedAreas: kind === syncEventKinds.watchHistory ? ["continue_watching"] : ["snapshot"],
    occurredAt: now.toISOString(),
  };
}
