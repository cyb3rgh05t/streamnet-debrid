# StreamNet 2.3.001 Release

Date: 2026-09-04

## Scope

This release consolidates cloud and tracker conflict handling, Home Server library controls, StreamNet IPTV category visibility, Settings consistency, and Live TV runtime fixes.

The production boundary remains unchanged:

- Android APK and the self-hosted `https://auth.mystreamnet.club` service are the supported runtime.
- Cloud profile changes remain fields in the existing JSON snapshot; no PostgreSQL schema migration is required.
- Netlify and Supabase are not runtime dependencies.
- Media3 remains at 1.10.1.

## Cloud and tracking state

- Settings changes use one cancelable 350 ms debounce job before cloud synchronization. Cancellation is propagated, while unexpected authentication, push, and restore failures are recorded and exposed as sync failures instead of escaping the ViewModel scope.
- Trakt token snapshots include an `updatedAt` timestamp. Import applies newer credentials and newer credential tombstones while legacy payloads can only fill an empty local credential.
- Tracking provider selection, read modes, and Trakt/Simkl write targets use a per-profile selection timestamp.
- Simkl and MDBList credentials have independent timestamps, allowing credential changes and removals to merge without rolling back unrelated tracking preferences.
- Connecting a second tracker preserves a still-connected preferred provider. A read mode is repaired only when its selected provider is no longer available.
- Push conflict reconciliation preserves newer remote tracking selections and credentials before retrying the profile snapshot.

## Home Server and Home

- Home Server candidates are restricted to movie and series libraries. Plex collections and Jellyfin/Emby box sets, music, photo, and mixed libraries are excluded.
- Every persisted server connection retains an enabled flag per video library. TV and touch Settings expose these libraries separately from connection credentials.
- Disabling a library updates the profile connection JSON, triggers cloud synchronization, and removes the corresponding generated catalog without changing the server connection.
- Home Server Settings are grouped into server creation, connected server subsections, per-server library controls, and global server actions.
- The Home Server header reports `Working` while connecting, `Ready` when at least one server is stored, and `Idle` only when no server exists.
- Home keeps usable cached catalog rows while fresh providers load. A successful load records freshness and foreground refresh is limited to stale data after six hours.

## IPTV and Live TV

- The StreamNet preset stores excluded movie and series category IDs per profile and exports/imports them in the IPTV cloud snapshot.
- Missing fields in legacy Gson payloads normalize to empty exclusion lists, preserving the default behavior that all categories are visible.
- Category exclusions filter StreamNet Home availability only. Search, playback-source resolution, and non-StreamNet Xtream playlists remain unchanged.
- IPTV Settings show a top-level Playlists section and one subsection per playlist. Live category visibility and StreamNet VOD category visibility are separate controls.
- Mobile playlist subsections retain enable, edit, reorder, and delete actions. The StreamNet preset remains protected from deletion and reordering.
- Live TV keeps a pending local session until DataStore confirms it, preventing unrelated Settings emissions from restoring an older group or channel during refresh/navigation.
- The preview TextureView is detached before fullscreen owns the ExoPlayer surface and cannot reattach until fullscreen exits, preventing green decoder/compositor artifacts.

## Interface, plugins, and updates

- App notifications share a minimum height, themed surface, and bottom offset above system navigation and the touch bottom bar.
- IPTV progress uses the same notification surface as standard toasts.
- Plugin add, reset, and repository-removal dialogs resolve the active accent for input focus and primary actions. Destructive warning headings remain red.
- Plugin success/error state uses localized string resources instead of embedded English messages.
- Watchlist tracker list labels are localized while provider identities remain stable.
- The update modal displays GitHub release `body` text for update-available, downloading, ready-to-install, installing, and retry states whenever the state carries release metadata.
- The Android workflow explicitly calls GitHub's generated-release-notes API. New releases use the generated body; an existing release is backfilled only when its description is empty, preserving manual notes.

## Supporting runtime fixes

- Shared networking initializes from `Application.attachBaseContext`, and unsuccessful HTTP responses receive `Cache-Control: no-store` to avoid replaying cached server errors.
- Trailer fallback explicitly requests English only when the original request did not specify a language.
- Home navigation first restores the existing Home destination and recreates it only when it is absent from the back stack.

## Compatibility and merge notes

- Preserve the self-hosted cloud endpoint and profile JSON merge semantics during upstream integrations.
- Keep the StreamNet-only guard around IPTV VOD exclusions; generic Xtream playlists must not inherit StreamNet category settings.
- Keep credential timestamps independent from tracking-selection timestamps so updating one provider cannot roll back another.
- Keep exclusive player-surface ownership between the TV preview and fullscreen PlayerView.
- GitHub release descriptions are now consumed by the APK update dialog and must not be left empty.

## Validation

Release validation commands:

```powershell
.\gradlew.bat -PenableUnitTests :app:testSideloadDebugUnitTest --no-daemon --console=plain
.\gradlew.bat :app:assembleSideloadDebug --no-daemon --console=plain
git diff --check
```

Also verify IDE diagnostics for touched Kotlin, resource, Gradle, and workflow files. The final APK path and SHA-256 are recorded after assembly.

## Release

- Version name: `2.3.001`
- Version code: `382`
- Variant: `sideloadDebug`
