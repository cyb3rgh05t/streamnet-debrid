# StreamNet Web 1.0.046 - Franchise Parity

Date: 2026-09-22

## Scope

This release aligns the Web franchise browser with the Android franchise catalog behavior.

## Source parity

- Android legacy MDBList fallbacks are represented as `MDBLIST_PUBLIC` Web sources.
- Addon catalog sources remain separate from public MDBList list sources.
- Direct TMDB collection fallbacks remain available when addon or list sources are empty.
- Marvel, DC Universe, Star Wars, Harry Potter, and X-Men include the Android legacy fallback sources.
- Existing direct TMDB fallbacks cover the remaining franchises that previously had incomplete Web source definitions.

## Ordering parity

- Marvel uses the Android MCU phase order.
- DC Universe uses the Android curated DC order.
- Star Wars uses the Android in-universe timeline order.
- Curated franchise sources are loaded first and are not resorted by release date.
- Non-curated franchises retain chronological release-date ordering.

## UI and runtime fixes

- Empty Web collection rails remain visible with an empty-state message instead of disappearing silently.
- Duplicate Home rail IDs are filtered before rendering, preventing React key collisions and unstable rail reuse.
- The Home rail deduplication logic now handles grouped collection entries and single catalog entries safely.

## Validation

- `npm --prefix web test`
- `npm --prefix web run build`

Both commands passed for Web 1.0.046.
