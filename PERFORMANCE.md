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

## Android 2.6.x TV Performance Work

Date: 2026-11-08. Releases 2.6.000 to 2.6.002 and the follow-up library update below. These changes target slow behaviour reported on Android TV, where phones and tablets feel fluid. The cause was not measured on TV hardware; the changes follow code-level findings, and no device FPS, startup time or percentage speedup is claimed.

### Hypotheses From Code Review

Android TV boxes typically combine weak CPUs, 1.5 to 2 GB RAM, slow storage and 1080p/4K output with heavy overdraw. The app already had a TV-sized Coil cache, RGB_565 decoding, target-size image requests, a baseline profile, trailer autoplay off by default, SQLite-backed channel lists and fast-scroll detection. The candidates found were:

- R8 could barely optimise or shrink the app: blanket keep rules for `androidx.compose.**` and `com.arflix.tv.**`, plus broad keeps for Media3, Coil, Ktor, Jackson, Supabase and TDLib.
- Compose BOM `2024.06.00`, pinned there only because of `tv-foundation` alpha11.
- Home rows recomposed on every frame of the scroll animation, because `firstVisibleItemIndex` and `firstVisibleItemScrollOffset` were read directly in composition.
- The Home backdrop was decoded at full screen resolution, which is roughly 33 MB per 4K bitmap against a 48 MB TV image cache.

### Implemented Changes

| Change | Measured result |
| --- | --- |
| Removed the blanket Compose keep rules | Release DEX 49.6 MB to 30.4 MB |
| Replaced the blanket `com.arflix.tv.**` keep with targeted rules (Gson fields and no-arg constructors, `domain.model` for Moshi reflection, WorkManager workers, Discord JNI bridge, Hilt entry points, Retrofit R8 full-mode rules, `XtreamDiskCache`) | Release DEX about 27 MB |
| Replaced `TvLazyRow`, `TvLazyColumn`, `TvLazyVerticalGrid` with the standard Lazy layouts and removed `tv-foundation` | Build and emulator checks only |
| Compose BOM `2024.06.00` to `2026.06.01` | See the AGP limit below |
| Home rail scroll position read through `derivedStateOf` | Not measured |
| Home backdrop decode size capped at 1920x1080 | Not measured |

The Compose BOM stops at `2026.06.01`. `2026.08.00` and newer (Compose 1.12) require AGP 9.1, while the project stays on AGP 8.13.2 because Hilt 2.59 does not work with AGP 9 yet.

### Regressions Introduced And Fixed

The change set caused three regressions that unit tests did not catch. They are fixed in 2.6.001 and 2.6.002:

- IPTV-only Home showed only the Live-TV rows. R8 removed the type parameter of the generic `XtreamDiskCache<T>`, Gson threw `requires 0 type arguments, but got 1`, the provider VOD library never loaded and the filter hid every other row. Fixed with a keep rule. A loaded availability set now also survives an empty refresh, and failures are logged with the `[IPTV-VOD]` tag.
- Netflix Live-TV channel cards needed two OK presses. The card had a redundant `focusable()` next to `combinedClickable`; with the new Compose version the second focus target swallowed the first press. An A/B build confirmed it: the pure 2.5.099 build starts the stream on one press. The redundant `focusable()` was removed.
- The collection tabs (Timeline, Movies, Series) needed two OK presses for the same reason, with a redundant `focusable()` next to `clickable`. Removed in 2.6.002.

Lessons: a minified build needs a smoke test that loads every Gson cache type, and focus behaviour needs a one-press check after any Compose upgrade.

### Library Update

Updated to the newest versions compatible with AGP 8.13.2 and compileSdk 36: Coil 2.5.0 to 2.7.0, Lifecycle 2.7.0 to 2.10.0, Activity 1.10.0 to 1.12.4, Core KTX 1.12.0 to 1.17.0, DataStore 1.0.0 to 1.2.1, WorkManager 2.9.0 to 2.11.2 and ProfileInstaller 1.3.1 to 1.4.1.

- Not updated: `kotlinx-coroutines` stays at 1.7.3 because `configurations.all` forces it, added in 6d1121a2 ("fix build failed by plugins feature"). The reason for the pin is not documented. Navigation Compose (2.7.6), Hilt Navigation Compose (1.1.0), Media3, Ktor (2.3.7), Retrofit, OkHttp, jsoup and Sentry were not changed in this round.
- Checked: both flavours compile, 911 unit tests pass (0 failures/errors, 1 skipped), the Sideload Staging build with R8 succeeds with the same DEX size class (9.1, 11.4 and 6.7 MB). On the emulator Home rows, a collection tab switch and a Live-TV channel start on one press work.
- Not checked: VOD playback, Trakt and cloud sync, plugins, Discord, Telegram, and every Coil 2.7 behaviour change beyond what the screens above show.

### Open Work

Work through these over time, measuring each step where it claims an effect:

1. Smoke-test the minified build in the areas not yet exercised (VOD playback, Trakt, cloud sync, plugins, Discord, Telegram).
2. Add a test that loads every Gson cache and persisted type on a minified build.
3. Measure cold start, focus-change latency and frame timing on a real low-end TV, before and after, for example with Perfetto and `dumpsys gfxinfo`.
4. Regenerate the baseline profile; `baseline-prof.txt` dates from 2026-10-28, before the Compose and R8 changes.
5. Add a low-end TV mode that reduces hero video, trailers in cards, crossfades and prefetch volume. Today `isLowRamDevice` only sizes the caches.
6. Split the very large `HomeScreen` and `HomeViewModel` and collect narrower state flows, so one field no longer recomposes the whole Home.
7. Narrow the remaining blanket keep rules (Media3, Coil, Ktor, Jackson, Supabase, TDLib), one package at a time with a device test.
8. Update the remaining libraries individually: Navigation Compose, Hilt Navigation Compose, Media3, Ktor, Retrofit, OkHttp, jsoup, Sentry, and find out why coroutines is pinned.
9. Compose 1.12 and newer: blocked until AGP 9.1 and a working Hilt are available.
10. Review the remaining `focusable()` plus click patterns (skip-intro button, variant picker, Live-TV category chip). They also handle OK in `onKeyEvent` and are probably unaffected, but this was only read, not run.
