# Watched-Sync und Cloud-Session - Stand 2026-09-07

## Umfang

Version `2.3.009` stabilisiert den profilbezogenen Gesehen-Status auf mehreren
Geräten und verhindert einen irreführenden Cloud-Verbinden-Button bei
vorübergehenden Fehlern während der Sessionprüfung.

## Gesehen und ungesehen

Die lokalen Film- und Episodenmengen allein konnten eine Entfernung bisher
nicht ausdrücken. Beim Zusammenführen zweier Cloud-Snapshots wurden deshalb
beide Mengen vereinigt. Ein auf einem Gerät als ungesehen markierter Titel
konnte dadurch aus einem älteren Snapshot eines anderen Geräts erneut als
gesehen importiert werden.

Für Filme und Episoden werden nun profilbezogene Änderungszeitpunkte geführt.
Der Cloud-Merge entscheidet pro Titel beziehungsweise Episode nach der neuesten
Aktion:

- Eine neuere Ungesehen-Aktion entfernt einen älteren Gesehen-Eintrag.
- Eine spätere Gesehen-Aktion kann denselben Titel wieder hinzufügen.
- Snapshots ohne Änderungszeitpunkte behalten das bisherige kompatible
  Union-Verhalten, damit ältere App-Versionen keine bestehenden Haken verlieren.

Die Zeitstempel werden bei Einzelaktionen aus der Detailseite, automatischen
Gesehen-Aktionen und vollständigen Staffelaktionen aktualisiert. Sie liegen im
bestehenden JSON-Snapshot; eine Backend-Migration ist nicht erforderlich.

## Cloud-Verbindungsstatus

Beim App-Start wird eine lokal gespeicherte Nutzer-ID zusammen mit einem
vorhandenen Access- oder Refresh-Token sofort als bekannte Cloud-Identität
behandelt. Schlägt eine technische Sessionprüfung vorübergehend fehl, bleibt
die Profilauswahl deshalb verbunden und zeigt keinen falschen
Cloud-Verbinden-Button.

Die Sicherheitsgrenze bleibt unverändert: Antwortet der Backend-Refresh mit
`401` oder `403`, werden die abgewiesene Session und das lokale Cloud-Profil
gelöscht. Ohne gespeicherte Identität bleibt der Zustand ebenfalls
`NotAuthenticated`.

Das Setup mit mehreren TVs, Smartphones oder Tablets verwendet weiterhin pro
Anmeldung eigene Refresh-Sessions. Die Geräte überschreiben ihre Sessions
nicht gegenseitig.

## Nicht betroffen

- Skip Intro, Recap und Credits
- Wiedergabe- und Quellenauflösung
- Watch History und Continue Watching
- Backend-Schema und Datenbankmigrationen

## Validierung

- Fokussierte Cloud-Merge-Regressionstests: erfolgreich
- Fokussierte Cloud-Startup-Sessiontests: erfolgreich
- Vollständige aktivierte Sideload-Unit-Suite: erfolgreich
- `:app:assembleSideloadDebug`: erfolgreich
- `:app:assembleSideloadRelease`: erfolgreich
- Release-APK SHA-256:
  `1DC6EB3379CF08B5F424BE1E7A2E1253BB7C55B1AE0A37F069C3B85892E20BE2`
