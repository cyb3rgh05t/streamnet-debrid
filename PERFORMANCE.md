# Performance Review: Android, Backend, Web

Date: 2026-11-02

## Initial Review Baseline

- Android: 2.5.093 / version code 494; Kotlin, Compose, TMDB metadata, IPTV and player repositories.
- Backend: 1.0.039; self-hosted Fastify and PostgreSQL at `https://auth.mystreamnet.club`.
- Web: 1.0.071; self-hosted Next.js webplayer, separate from the backend.
- Working tree was clean before this review. No deployment, database mutation, migration, version bump, commit or push was performed.

The source inventory found 449 files across Android main sources (excluding resources, assets and C++), backend sources and Web app/lib/components. This was a cross-system structural scan and a focused review of metadata requests, caches, request limits, presence and dashboard database access, not an exhaustive line-by-line audit of all files. Existing documentation and recent changelog entries were checked to avoid reintroducing superseded runtime or synchronization behavior. The resolver worker, native decoder code, instrumented UI tests and production query plans were not audited.

## Implemented Changes

### Android Logo Requests

`MediaRepository.getLogoUrl` checked its cache before entering a three-request semaphore but did not share pending requests. Concurrent requests for one uncached logo could each call TMDB.

Requests now share a `CompletableDeferred` per media type, ID and content language, following the repository's existing full-details pattern. The cache is rechecked after acquiring a semaphore permit. Completed and failed pending entries are removed. A successful empty result retains the existing five-minute negative cache; network errors are not cached as misses.

Each caller retains its own `propagateNetworkFailure` policy. Cancellation remains cancellation; cancelling a waiting caller does not cancel the loader. As in the existing full-details implementation, the initiating caller owns the loader lifetime. Cached and search-warmed logos now include the content language in their key, preventing reuse of another language's logo or negative result.

Four new tests cover nine overlapping calls producing one TMDB request, cached misses, shared failure with distinct caller policies, retry, language-specific warmup and cancellation of a waiting caller.

### Web TMDB Requests

The central `tmdb` function limited concurrent requests to four, but duplicate calls still occupied separate slots. It now shares an in-flight promise before acquiring a slot. The key includes the normalized URL, sorted query parameters and trimmed custom API key. Languages and API keys remain isolated. Entries are removed on both success and failure; no new persistent or time-based result cache was introduced.

Two new tests cover five simultaneous calls with three distinct request identities producing three fetches, parameter/path normalization, key separation, cleanup after completion, shared HTTP errors and subsequent retry. Existing retry and rate-limit behavior is unchanged.

### Backend Dashboard Queries

The overview previously awaited its statistics query before starting the independent recent-account, recent-audit and migration queries. All four now start together through the existing PostgreSQL pool, after admin authentication. No cache or SQL counting changes were introduced. The reported database duration now measures completion of the full group.

A regression test holds the statistics query open and verifies that the other three queries have already started. This demonstrates removal of the serial dependency, not a measured production latency reduction. Pool capacity and database load still determine actual overlap and throughput.

## Validation

| Check                                          | Result                                      |
| ---------------------------------------------- | ------------------------------------------- |
| Android Sideload JVM suite, explicitly enabled | 896 tests, 0 failures/errors, 1 skipped     |
| New Android logo tests                         | 4 passed                                    |
| Backend suite                                  | 138 passed, 1 existing Windows/CRLF failure |
| Focused backend overview tests                 | 10 passed                                   |
| Web suite                                      | 114 passed                                  |
| Web production build, lint and type validation | Passed                                      |

The existing backend failure is `dashboard online shortcut always enables the filter, even after repeated clicks` in `admin-account-filter.test.js`. It was already documented for Backend 1.0.039 and is unrelated to the changed route and test fixture. It was left unchanged.

The default Android build output was locked by another Windows process at `bundleSideloadDebugClassesToCompileJar/classes.jar`. Validation used a temporary local Gradle init script to redirect build outputs into `.gradle/performance-validation`, without stopping existing processes or deleting their files. The full suite also emitted a Robolectric temporary HTTP-cache cleanup warning, but completed successfully with the test totals above.

Normal validation commands, from the repository root:

```powershell
.\gradlew.bat :app:testSideloadDebugUnitTest -PenableUnitTests --no-daemon --console=plain -q
npm --prefix backend-cloud test
npm --prefix web test
npm --prefix web run build
```

## Remaining Measurement Work

- Compare cold start, Home navigation, metadata hydration and frame timing on the target Android TV hardware with equivalent release builds and data. Unit-test request counts are not FPS or startup benchmarks.
- Capture production PostgreSQL query plans and timings for the overview's watched-state JSON expansion at realistic account/snapshot sizes before considering indexing, materialized counts or caching. No production access was performed here.
- Measure Web navigation and metadata waterfalls with warm and cold caches. The production build reports 311 kB First Load JS for `/`; bundle splitting needs a separate measured assessment, not an assumption that all of this code is unnecessary.
- Profile remaining provider, EPG, artwork, player and synchronization paths individually before changing concurrency limits or conflict handling. The static scan found existing limits and background scheduling, which should not be removed without evidence.

No device FPS, production latency, memory reduction or percentage speedup is claimed by this review.

## Android Log Follow-Up

The subsequent emulator log showed five TMDB logo 404s for internal Home Live-TV channel hashes, plus a 51-frame stall and repeated ART compiler-instruction-limit messages for `LiveTvScreen`. These observations are separate from the earlier request-coalescing tests.

The focus-window logo prefetch now excludes Live-TV and collection entries, matching the existing category-prefetch policy. The object-based repository logo API additionally rejects their explicit `iptv:` and `collection:` status markers, without guessing from ID magnitude. Two added tests verify that an internal ID from the log produces no TMDB image request, while a regular TV item still does. The six logo tests pass.

Live-TV preferences now use one lifecycle-bound DataStore collector for all six fields, with the original profile keys and defaults and `distinctUntilChanged`. Channel-list processing, back handlers, temporary overlay state and focus-requester initialization are separated into cohesive local helpers. Guide, interaction and player orchestration use separate composable lambdas, following the screen's existing UI-body pattern. Playback, catch-up, focus actions and saved full-screen state are preserved.

SDK `dexdump` comparison of the previous and final debug APKs confirmed:

| Compilation Unit                                   | 16-Bit DEX Code Units |
| -------------------------------------------------- | --------------------- |
| Original `LiveTvScreen`                            | 22,322                |
| Final `LiveTvScreen`                               | 4,260                 |
| Extracted guide orchestration                      | 6,559                 |
| Extracted interaction orchestration                | 3,542                 |
| Extracted player orchestration                     | 4,558                 |
| Largest remaining Live-TV method, existing UI body | 12,310                |

Intermediate versions at 20,411 and 19,925 code units still produced the compiler-limit warning on the emulator, so merely reducing the original method below 20,000 was not sufficient. In the final process, the runtime logged successful compilation of `LiveTvScreen` and the guide block instead. No compiler-limit warning, fatal exception or ANR was found in the inspected final-process log window, and the UI hierarchy confirmed a channel, current programme and guide information were displayed. This is a functional/JIT smoke test, not a controlled before/after frame-time benchmark.

At this checkpoint, the enabled Sideload JVM suite had 898 tests, 0 failures/errors and 1 skipped. The known Windows Robolectric temporary-cache cleanup warning remained. Debug APK was built and installed on `emulator-5554` with an update install, without clearing application data. No Android commit, push or release had been performed at that checkpoint. Real-device frame-time profiling remains necessary before claiming elimination of the observed stall or any FPS improvement.

## Android 2.5.094 Release

The Android changes are included in version 2.5.094 / code 495. Backend and Web source changes are excluded from this release.

- Description matching now uses distinctive matches as a proportion of the EPG description rather than saturating after a few words. The reproduced For All Mankind case selects the 2019 series instead of the 1989 documentary, while the existing Equalizer and Ghosts regression cases remain covered.
- Dotted initialisms are compacted before article removal, so S.W.A.T./SWAT, N.C.I.S./NCIS and A.I./AI match consistently. Regression tests preserve movie/series, explicit-year and spin-off distinctions. The user's specific remaining S.W.A.T. misidentification was not available in the retained runtime log; no claim is made that every ambiguous programme can be resolved correctly.
- The Netflix Live-TV video preview uses a black first-frame cover with the existing centered channel logo instead of a gradient. Buffering and first-frame transitions are retained.
- Final full Android suite: 903 tests, 0 failures/errors, 1 skipped. Debug build passed. Existing Windows Robolectric cleanup warnings are not test failures. No new FPS or production latency benchmark is claimed.
