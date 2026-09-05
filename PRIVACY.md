# Privacy Policy

Last updated: September 5, 2026

## 1. Scope And Controller

This policy explains how the StreamNet project processes personal data in the Android app and StreamNet Cloud account portal. StreamNet is an open-source media hub and does not host, sell, or distribute movies, series, live TV channels, playlists, or third-party streams.

The StreamNet project owner is the data controller for StreamNet Cloud, the account portal, first-party usage measurements, and first-party website services. Third-party services that you connect may act as separate controllers under their own privacy policies.

For privacy requests, use the secure account deletion page at [auth.mystreamnet.club/delete-account](https://auth.mystreamnet.club/delete-account) or contact the project through [GitHub](https://github.com/cyb3rgh05t/streamnet-debrid). Do not put passwords, tokens, identity documents, or other sensitive data in a public GitHub issue.

## 2. Data Stored Only On Your Device

StreamNet can store profiles, preferences, playback progress, watch history, watchlist entries, addon configuration, IPTV configuration, home-server configuration, caches, and authorization tokens locally on your device. This local data is not received by StreamNet unless you enable a cloud feature, send a diagnostic report, or connect a third-party service that needs it.

You can remove local data by using the relevant in-app controls, clearing Android app data, or uninstalling the app.

## 3. StreamNet Cloud Account And Sync

Creating an StreamNet Cloud account processes:

- Your email address, account identifier, password hash, authentication sessions, and password-reset records
- Profiles, settings, catalog order, addon configuration, IPTV configuration, watchlist, watch history, playback progress, and other data you choose to sync
- Security and operational information such as timestamps, request metadata, and IP address in infrastructure logs

StreamNet stores a one-way password hash, not your plain-text password. StreamNet Cloud is optional; the Android app can be used without an StreamNet Cloud account.

The legal basis for account authentication and requested cloud sync is performance of the service you request (GDPR Article 6(1)(b)). Security, abuse prevention, reliability, and limited operational logging are based on StreamNet's legitimate interests in operating and protecting the service (Article 6(1)(f)).

## 4. Diagnostics And Usage Measurement

Release builds can send limited diagnostics and usage information when **Share diagnostics and usage** is enabled in Settings. This is a device-local choice and is not cloud-synced.

### Crash diagnostics

StreamNet can send crash stack traces, exception details, app version and build, device model, Android version, and limited diagnostic breadcrumbs to Sentry. A build configured for Firebase may use Firebase Crashlytics as a fallback. StreamNet disables default PII collection, screenshots, view hierarchy, network breadcrumbs, and user-interaction breadcrumbs. App-provided diagnostic logs are sanitized to remove URLs, email addresses, tokens, and IP addresses. Exception text and infrastructure transport can still contain personal data such as an IP address, so StreamNet does not describe crash reports as anonymous.

### App-open measurement

At most once per 24 hours, StreamNet can send an `app_open` event to the self-hosted StreamNet backend containing a random install identifier, app version, Android API level, device type, distribution type, and account ID, email address, and profile ID when signed in. These fields are stored in the first-party `app_usage_events` table. This measurement is used only to estimate daily and weekly active use and release adoption; it is not used for advertising or user profiling.

These activities are based on StreamNet's legitimate interests in finding crashes, measuring release health, and maintaining a reliable service (Article 6(1)(f)). You can object at any time by turning **Share diagnostics and usage** off in Settings. Turning it off does not affect playback, accounts, or cloud sync.

### Cloud analytics and optional membership events

StreamNet may use first-party server-side logs from the self-hosted account portal to count account portal requests, approximate unique visitors, referrers, and countries from delivery logs. StreamNet does not add advertising trackers or cross-site profiling cookies.

If you use optional membership or entitlement features exposed through StreamNet Cloud, StreamNet records a small set of service events such as viewing membership information, starting a trial, opening checkout, linking a membership, and completing the first successful playback. Account identifiers are converted into a keyed pseudonymous value before storage. Events can contain coarse campaign attribution and device or outcome labels, but not your email address, watched title, stream URL, addon URL, or payment details. Ko-fi separately handles payment details under its own privacy policy.

These measurements are used to understand whether account connection, trials, playback, and membership activation work correctly and where the service needs improvement. They are not used for advertising or sold to third parties. They are based on StreamNet's legitimate interests in operating and improving the optional cloud service (Article 6(1)(f)).

### Trial emails

When you deliberately start a StreamNet Cloud trial, StreamNet sends only three service messages: confirmation that the trial started, one reminder before it expires, and one final expiry notice. The temporary delivery queue stores the email address encrypted and is not a general marketing mailing list.

## 5. Optional Third-Party Services

Data is also sent to services you deliberately use or connect:

| Service                       | Purpose                                                                                    | Privacy policy                                                                     |
| ----------------------------- | ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| Self-hosted StreamNet backend | StreamNet account portal, cloud sync, TV pairing, Discord pairing, and account deletion | This policy                                                                        |
| Resend                        | Account verification and password-reset email delivery                                     | [resend.com/legal/privacy-policy](https://resend.com/legal/privacy-policy)         |
| Sentry                        | Crash reporting and diagnostics when enabled                                               | [sentry.io/privacy](https://sentry.io/privacy/)                                    |
| Firebase Crashlytics          | Crash-reporting fallback in configured builds                                              | [firebase.google.com/support/privacy](https://firebase.google.com/support/privacy) |
| TMDB                          | Movie and TV metadata and images                                                           | [themoviedb.org/privacy-policy](https://www.themoviedb.org/privacy-policy)         |
| Trakt.tv                      | Optional watch history, progress, ratings, and watchlist sync                              | [trakt.tv/privacy](https://trakt.tv/privacy)                                       |
| Discord                       | Optional Rich Presence login and the title/playback status you choose to display           | [discord.com/privacy](https://discord.com/privacy)                                 |
| Ko-fi                         | Optional StreamNet Cloud membership verification                                           | [ko-fi.com/privacy](https://ko-fi.com/privacy)                                     |
| User-configured services      | Addons, IPTV providers, Plex, Jellyfin, Emby, debrid services, and URLs you add            | Governed by the provider you configure                                             |

StreamNet sends only the data needed for the requested integration. Third-party services may process data outside the European Economic Area under their own transfer mechanisms and terms.

## 6. Retention

- Local data remains until you remove it, clear app data, or uninstall StreamNet.
- StreamNet Cloud account and sync data remains while the account is active and is deleted when account deletion completes, except for a minimal record required to prove or secure the deletion.
- Stored first-party app-open events are retained for up to 31 days.
- Pseudonymous Premium funnel events are retained for up to 90 days.
- Completed Premium trial email jobs are removed within 14 days. Pending jobs contain an encrypted email address only until delivery finishes or retries end.
- Password-reset and device-pairing codes expire after a short operational period.
- Crash diagnostics follow the configured Sentry or Firebase retention period and are kept only as long as needed to investigate app stability.
- Infrastructure security logs follow the hosting provider's operational retention schedule.

StreamNet may keep data longer where required by law, to resolve a dispute, or to prevent abuse, and will keep only what is necessary for that purpose.

## 7. Security

StreamNet uses HTTPS for first-party cloud services and supported APIs, hashes account passwords with a salted memory-hard password function, limits crash-report contents, and scopes cloud data to authenticated accounts. No system is risk-free.

StreamNet also permits user-configured HTTP URLs for local servers and IPTV providers because some private-network services do not support HTTPS. HTTP traffic is not encrypted. Prefer HTTPS and only add services you trust.

## 8. Your Rights

Depending on where you live, you may have the right to access, correct, export, restrict, object to, or delete your personal data, and to complain to your local data-protection authority. You can:

- Disable diagnostics and usage reporting in app Settings
- Disconnect Trakt and other optional services in app Settings
- Revoke StreamNet from the relevant third-party account
- Delete your StreamNet Cloud account and synced data at [auth.mystreamnet.club/delete-account](https://auth.mystreamnet.club/delete-account)

StreamNet may need to verify that a request concerns your account before acting on it.

## 9. Children's Privacy

StreamNet is not directed at children who cannot legally manage their own online account in their country. StreamNet does not knowingly create cloud accounts for such children without authorization from a parent or guardian.

## 10. Changes

This policy may change when StreamNet's services or legal obligations change. Material changes will be published with a new date, and an in-app or account notice will be used when appropriate.

---

_StreamNet is an open-source project licensed under Apache 2.0._
