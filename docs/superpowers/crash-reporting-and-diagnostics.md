# Crash Reporting And Diagnostics

Last updated: September 5, 2026

## Recommendation

Firebase is not required for StreamNet TV, including Play Store releases.

- Google Play Console Android Vitals already reports crashes and ANRs from Play-distributed builds without adding Firebase.
- The app's existing detailed crash-reporting integration prefers Sentry and can use either hosted Sentry or a self-hosted Sentry installation through its DSN.
- Firebase Crashlytics is only an optional fallback. The repository has no `google-services.json`, and its Google Services and Crashlytics Gradle plugins are disabled.
- The self-hosted StreamNet account backend does not currently accept crash stack traces. It receives only the separate first-party app-start measurement described below.

For the current architecture, keep Firebase disabled. Use Android Vitals alone, or configure Sentry when breadcrumbs and handled exceptions are needed.

## Settings Switch

The **Share diagnostics and usage** setting is stored locally in `arvio_privacy_preferences` under `diagnostics_and_usage_enabled`. It is not profile-scoped and is not cloud-synced. The default is enabled.

Turning the setting off:

- Closes Sentry.
- Disables Firebase Crashlytics collection if Firebase is available.
- Removes the active crash-context provider from `AppLogger`.
- Prevents future app-start events from being sent.

Turning it on initializes the available crash provider and permits app-start measurement. It does not make an unconfigured provider operational.

## Crash Reports

`DiagnosticsManager` tries providers in this order:

1. Sentry through `SentryCrashReporter`.
2. Firebase Crashlytics through `CrashlyticsProvider` if Sentry cannot initialize.

Crash reporting is compiled on only when `BuildConfig.ENABLE_CRASH_REPORTING` is true:

| Build type   | Crash reporting                       |
| ------------ | ------------------------------------- |
| `release`    | Enabled when a provider is configured |
| `staging`    | Enabled when a provider is configured |
| `debug`      | Disabled                              |
| `selfHosted` | Disabled because it inherits `debug`  |

### Sentry

Sentry initializes only when `SENTRY_DSN` contains a real DSN. A DSN can point to hosted Sentry or a self-hosted Sentry server. The current local configuration has no active DSN, so Sentry does not send reports.

The app disables screenshots, view hierarchy capture, tracing, profiling, replay, SDK logs, metrics, network breadcrumbs, and interaction breadcrumbs. Fatal crashes are retained; handled exceptions and ANRs are filtered, sampled, rate-limited, and deduplicated.

### Firebase Crashlytics

Firebase is currently not configured. The repository does not contain `app/google-services.json`, and the required Gradle plugins remain commented out. The dependency alone does not provide a working destination.

### Google Play Android Vitals

Android Vitals is independent of the in-app Sentry/Firebase integration. It can report crashes and ANRs for Play-distributed builds through Play Console. It does not receive the custom `AppLogger` breadcrumbs or handled exceptions used by the Sentry integration.

## App-Start Measurement

App-start measurement is independent of Sentry and Firebase. When diagnostics sharing is enabled, `AppUsageAnalyticsRepository` sends at most one `app_open` event every 24 hours to:

```text
https://auth.mystreamnet.club/app-usage-event
```

The event contains a random installation ID, app version and code, Android API level, device type, and distribution. When a StreamNet Cloud account is active, it can also contain account ID, email address, and profile ID. The production backend stores these fields in PostgreSQL table `app_usage_events`.

The endpoint is deployed and responds with validation errors for invalid payloads. Migration `003_app_usage_events.sql` defines the required table. A successful production insert was not generated during verification because that would create artificial analytics data.

## Enabling Sentry

1. Deploy or choose a Sentry instance and create an Android project.
2. Put its DSN in the private `secrets.properties` file as `SENTRY_DSN=...`.
3. Build a `release` or `staging` variant. Debug and `selfHosted` builds intentionally disable crash reporting.
4. Keep **Share diagnostics and usage** enabled on the test device.
5. Trigger a controlled test exception in a non-production test build and verify receipt in Sentry.

Never commit a private DSN or other deployment credentials. A Sentry DSN is a submission endpoint rather than an administrative secret, but keeping environment configuration outside source control prevents accidental coupling to one deployment.

## Verification Status

Verified on September 5, 2026:

- Production usage endpoint is reachable and rejects an empty payload with HTTP 400.
- Self-hosted backend test suite passes: 26 tests.
- Local Sentry DSN is not configured.
- Firebase configuration and plugins are absent.
- Sideload debug builds have crash reporting disabled by build configuration.
