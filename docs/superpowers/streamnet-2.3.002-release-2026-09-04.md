# StreamNet 2.3.002 Release

Date: 2026-09-04

## Scope

This release adds profile-scoped protection for Settings, simplifies IPTV playlist controls, and corrects the TV Settings navigation order.

The production boundary remains unchanged:

- Android APK and the self-hosted `https://auth.mystreamnet.club` service are the supported runtime.
- Settings lock fields synchronize inside the existing profile JSON snapshot; no PostgreSQL migration is required.
- Netlify and Supabase are not runtime dependencies.

## Settings PIN

- Each profile can store an independent 4- or 5-digit Settings PIN as a salted SHA-256 hash.
- Lock activation, deactivation, and PIN changes synchronize with an independent timestamp so stale devices cannot roll back newer security state.
- The Settings root is gated before any subsection renders, including deep-linked routes.
- Access authorization resets when Settings leaves the foreground, requiring the PIN again on the next visit.
- The PIN dialog uses the selected profile accent for its lock icon, entered digits, primary action, and TV focus states while preserving semantic error colors.
- A configured PIN can remain stored while the lock is disabled; status displays use the effective lock state rather than PIN presence.

## Settings navigation

- The TV Profile group is ordered as Profile, Cloud Sync, and Accounts.
- The TV System group is ordered as Interface, Plugins, Network, and Info & Updates.
- Other Settings sections and their focus indices remain unchanged.

## Profile editor

- The selected profile accent identifies focus on the profile name field, photo and PIN controls, and dialog actions.
- The save action uses the active accent with contrasting text, while delete remains semantically red.
- Compact cancel and delete actions keep localized labels on one line in the TV layout.

## IPTV playlist interface

- Mobile and tablet playlist cards show one enabled toggle instead of repeating the state in the card header.
- Playlist controls follow the edit, enable, category, reorder, and delete flow while preserving protected StreamNet preset behavior.

## Compatibility and merge notes

- Preserve `settingsLockUpdatedAt` independently from general profile metadata timestamps during cloud merges.
- A lock is effective only when both `settingsLocked` is true and a valid stored PIN hash exists.
- Keep the Settings gate at the screen root so alternate navigation routes cannot bypass it.
- Keep the requested TV sidebar order when integrating upstream Settings changes.

## Validation

Release validation commands:

```powershell
.\gradlew.bat -PenableUnitTests :app:testSideloadDebugUnitTest --no-daemon --console=plain
.\gradlew.bat :app:assembleSideloadDebug --no-daemon --console=plain
git diff --check
```

## Release

- Version name: `2.3.002`
- Version code: `383`
- Variant: `sideloadDebug`
- APK SHA-256: `2B825E29B924F08522607FC4C391C187914A10BD0CCBFA9817E656AB60C6BD96`
