const {
  json,
  options,
  parseBody,
  payloadMetrics,
  isExistingSnapshotRicher,
  applyAddonWipeGuard,
  resolveIdentity,
  loadOrClaimSnapshot,
  saveSnapshotToDatabase,
  saveSnapshotToBlobs,
  appendSnapshotEvent,
} = require("./_backend");

const TRACKING_V2_FIELDS = [
  "watchlistReadMode",
  "continueWatchingReadMode",
  "watchedReadMode",
  "writeToTrakt",
  "writeToSimkl",
];

function preserveTrackingRouting(existingSnapshot, incomingPayload) {
  const previous = existingSnapshot?.payload?.mdbListSyncByProfile;
  const incoming = incomingPayload?.mdbListSyncByProfile;
  if (
    !previous ||
    typeof previous !== "object" ||
    Array.isArray(previous) ||
    !incoming ||
    typeof incoming !== "object" ||
    Array.isArray(incoming)
  ) {
    return incomingPayload;
  }
  const merged = { ...incoming };
  for (const [profileId, previousSelection] of Object.entries(previous)) {
    if (
      !previousSelection ||
      typeof previousSelection !== "object" ||
      Array.isArray(previousSelection)
    )
      continue;
    const incomingSelection = merged[profileId];
    if (
      !incomingSelection ||
      typeof incomingSelection !== "object" ||
      Array.isArray(incomingSelection)
    )
      continue;
    const next = { ...incomingSelection };
    for (const field of TRACKING_V2_FIELDS) {
      if (
        !Object.prototype.hasOwnProperty.call(next, field) &&
        Object.prototype.hasOwnProperty.call(previousSelection, field)
      ) {
        next[field] = previousSelection[field];
      }
    }
    merged[profileId] = next;
  }
  return { ...incomingPayload, mdbListSyncByProfile: merged };
}

exports.handler = async (event) => {
  const cors = options(event);
  if (cors) return cors;
  if (event.httpMethod !== "POST") {
    return json(405, { error: "method_not_allowed" });
  }

  try {
    const identity = await resolveIdentity(event);
    const body = parseBody(event);
    const rawPayload = body.payload;
    if (!rawPayload) {
      return json(400, { accepted: false, reason: "missing_payload" });
    }
    const hasExpectedRevision = Object.prototype.hasOwnProperty.call(
      body,
      "expectedRevision",
    );
    const expectedRevision = hasExpectedRevision
      ? Number(body.expectedRevision)
      : null;
    if (
      hasExpectedRevision &&
      (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0)
    ) {
      return json(400, {
        accepted: false,
        reason: "invalid_expected_revision",
      });
    }

    const existing = await loadOrClaimSnapshot(event, identity);
    // Server-side addon wipe guard: refuse pushes that catastrophically shrink
    // the addon list (recurring client bug); existing addons are merged back.
    const parsedPayload =
      typeof rawPayload === "string" ? JSON.parse(rawPayload) : rawPayload;
    const { payload: addonGuardedPayload, guarded } = applyAddonWipeGuard(
      existing,
      parsedPayload,
    );
    const guardedPayload = preserveTrackingRouting(
      existing,
      addonGuardedPayload,
    );
    if (guarded) {
      console.warn("account-sync-push: addon wipe guard engaged", {
        user: identity.supabaseUserId,
        incomingRootAddons: Array.isArray(parsedPayload.addons)
          ? parsedPayload.addons.length
          : null,
        preservedRootAddons: Array.isArray(guardedPayload.addons)
          ? guardedPayload.addons.length
          : null,
      });
    }
    const incoming = payloadMetrics(guardedPayload);
    if (isExistingSnapshotRicher(existing, incoming)) {
      return json(200, {
        accepted: false,
        reason: "existing_snapshot_is_richer",
        existing,
        revision: existing?.revision ?? 0,
        incoming: {
          restoreRank: incoming.restoreRank,
          profileCount: incoming.profileCount,
          scopedCoverage: incoming.scopedCoverage,
        },
      });
    }

    const snapshot = {
      payload: incoming.payload,
      payloadVersion: incoming.payloadVersion,
      restoreRank: incoming.restoreRank,
      profileCount: incoming.profileCount,
      scopedCoverage: incoming.scopedCoverage,
      payloadUpdatedAt: incoming.payloadUpdatedAt,
      source: "netlify",
    };
    const result = await saveSnapshotToDatabase(
      identity,
      snapshot,
      expectedRevision,
    );
    if (!result.saved) {
      return json(409, {
        accepted: false,
        reason: "revision_conflict",
        revision: result.current?.revision ?? 0,
        current: result.current,
      });
    }
    const saved = result.snapshot;
    const mirrorResults = await Promise.allSettled([
      saveSnapshotToBlobs(event, identity, saved),
      appendSnapshotEvent(event, identity, saved),
    ]);
    mirrorResults.forEach((mirrorResult, index) => {
      if (mirrorResult.status === "rejected") {
        console.warn("account-sync-push: post-commit mirror failed", {
          target: index === 0 ? "blob" : "event",
          message: mirrorResult.reason?.message || String(mirrorResult.reason),
        });
      }
    });

    return json(200, {
      accepted: true,
      revision: saved.revision,
      addonGuard: guarded,
      restoreRank: incoming.restoreRank,
      profileCount: incoming.profileCount,
      scopedCoverage: incoming.scopedCoverage,
    });
  } catch (error) {
    console.error("account-sync-push failed", error);
    return json(error?.statusCode || 500, {
      accepted: false,
      error: "sync_push_failed",
      message: error.message,
    });
  }
};
