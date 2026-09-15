# Continue Watching: sub-1% sessions (2026-09-15)

## Bug

Briefly starting a VOD/movie/episode (roughly 10s+ of real position) saved and
pushed a Continue Watching entry, but the item only ever showed up on
Android — never in the WebUI, and neither platform rendered a progress bar or
badge for it, because the rounded percentage was still `0%` (e.g. 10s into a
2h movie rounds to 0.14% → `0`).

## Root cause

- **Android** already had a deliberate bypass for this in
  `TraktRepository.saveLocalContinueWatching()`: an item with `progress < 1%`
  was still saved locally if `resumePositionSeconds >= 60` (`hasMeaningfulPosition`).
  But the rendered `MediaItem.progress` (via `ContinueWatchingItem.toMediaItem()`)
  stayed at the raw rounded value, so the progress bar/badge logic
  (`showPlaybackProgress = effectiveProgress in 1..94`) still hid it.
- **Web** read the same kind of entry from the self-hosted `/watch-history`
  endpoint (pushed unconditionally by `WatchHistoryRepository.saveProgress`,
  with no minimum-progress gate at all) but filtered it out of the Continue
  Watching rail entirely via `isPausedContinueWatchingItem()`, which required
  `progress >= 1`. Web had no equivalent "meaningful position" bypass.

## Fix

Shared constant on both platforms, lowered from Android's original 60s to 10s:

- Android: `Constants.MEANINGFUL_POSITION_SECONDS = 10L`
  ([Constants.kt](../../app/src/main/kotlin/com/arflix/tv/util/Constants.kt))
- Web: `MEANINGFUL_RESUME_POSITION_SECONDS = 10`
  ([continueWatching.ts](../../web/lib/continueWatching.ts))

Used in:

- `TraktRepository.saveLocalContinueWatching()` — save gate.
- `ContinueWatchingItem.toMediaItem()` — bumps a rounded-0% `effectiveProgress`
  to `Constants.MIN_VISIBLE_PROGRESS_PERCENT = 2` when the resume position is
  meaningful, so `showPlaybackProgress` and the existing bar-rendering code in
  `MediaCard.kt` pick it up unchanged. Resume-time/remaining-time labels still
  use the real stored position, unaffected by the bump.
- `isPausedContinueWatchingItem()` (web) — now includes items with
  `resumePositionSeconds >= MEANINGFUL_RESUME_POSITION_SECONDS` even at 0%
  rounded progress. Also used by `preferActiveCloudResumeRecord()`.
- `shouldShowContinueWatchingProgress()` (web) — gained an optional
  `hasMeaningfulPosition` flag; `MediaCard.tsx` passes it and clamps the
  rendered bar width to `MIN_VISIBLE_PROGRESS_PERCENT = 2` without touching the
  underlying `progress` value used elsewhere (e.g. the "Continue X%" label).
- `DetailsDrawer.tsx`'s `buildContinueLabel()` — falls back to plain
  "Continue" (instead of "Play") when there's a real but sub-1% resume
  position.

Sessions under 10s are still excluded as likely accidental taps — this was an
explicit, user-confirmed product decision, not an oversight.

## Validation

- Web: `web/tests/continue-watching-dismissals.test.cjs` — 20/20 pass,
  including new cases for the 10s cutoff and the sliver flag.
- Android: `ContinueWatchingItemTest` — new
  `toMediaItem_bumpsSubOnePercentResumeToVisibleSliver` test passes
  (`:app:testSideloadDebugUnitTest -PenableUnitTests`).
