# Xtream-VOD-Quellenprioritaet

Datum: 2026-09-15

## Ziel

Xtream-VOD-Quellen (`addonId = iptv_xtream_vod`) sollen bei der Quellenauswahl bevorzugt werden, wenn sie fuer den Titel vorhanden sind. Ohne Xtream-VOD bleibt die bisherige Sortierung unveraendert.

## Android

- Die manuelle Quellenliste priorisiert Xtream-VOD vor der konfigurierten Addon-Reihenfolge.
- Die automatische Wiedergabe priorisiert Xtream-VOD vor Host-Gesundheit, Web-Ready-Status, Qualitaet, Groesse, Cache-Status und Sprache.
- Innerhalb der Xtream-VOD-Gruppe bleiben die bestehenden Qualitaets-, Groessen- und Addon-Regeln erhalten.
- Die Kennung ist zentral als `StreamSource.isXtreamVodSource()` definiert.

Betroffene Dateien:

- `app/src/main/kotlin/com/arflix/tv/data/model/Models.kt`
- `app/src/main/kotlin/com/arflix/tv/ui/components/StreamSelector.kt`
- `app/src/main/kotlin/com/arflix/tv/ui/screens/details/AutoPlaySourcePlanner.kt`
- `app/src/main/kotlin/com/arflix/tv/ui/screens/player/PlayerViewModel.kt`

## Web

- Das gemeinsame Source-Ranking priorisiert Xtream-VOD fuer den manuellen Details-Selector, den Player-Selector und Auto-Hop.
- Die Addon-Aggregation verwendet dieselbe Prioritaet fuer progressive Stream-Listen.
- Die Prioritaet ist bewusst deutlich hoeher als Qualitaet, Browser-Kompatibilitaet und Debrid-/Cache-Gewichte, damit vorhandenes Xtream-VOD immer zuerst erscheint.
- Ohne Xtream-VOD veraendert sich der bisherige Score nicht.

Betroffene Dateien:

- `web/lib/sourceRank.ts`
- `web/lib/addons.ts`

## Validierung

- `:app:testSideloadDebugUnitTest -PenableUnitTests --tests com.arflix.tv.ui.screens.details.AutoPlaySourcePlannerTest`
- `npm --prefix web run build`
