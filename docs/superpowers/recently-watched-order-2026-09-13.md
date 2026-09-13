# Recently Watched: Reihenfolge

## Problem

Die Rails `recently_watched_movies` und `recently_watched_series` zeigten nicht die zuletzt gesehenen Titel zuerst. Neue Watched-Eintraege werden in den profilbezogenen Caches am Ende eingefuegt. Die Home-Aufbereitung las jedoch mit `take(20)` vom Anfang und waehlt dadurch die aeltesten Eintraege.

## Loesung

`HomeViewModel.buildRecentlyWatchedCategories()` wandelt beide Cache-Sets in Listen um und liest sie mit `asReversed()` vom Ende. Danach werden Serien weiterhin dedupliziert und auf 20 Eintraege begrenzt.

Damit gilt fuer beide Rails:

1. zuletzt als gesehen markierter Titel vorne
2. danach die vorherigen Titel in absteigender Einfuegereihenfolge
3. maximal 20 Eintraege

## Auswirkungen

Der Fix betrifft nur die Darstellung der beiden Recently-Watched-Rails. Continue Watching, der VOD-Player, Wiedergabefortschritt und die Watched-Synchronisierung bleiben unveraendert.

## Validierung

- `:app:compileSideloadDebugKotlin`
- `:app:assembleSideloadDebug`
- Debug-APK: `app/build/outputs/apk/sideload/debug/app-sideload-debug.apk`
