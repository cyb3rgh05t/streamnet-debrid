# Android 2.5.040: Home, Hero und CloudSync Performance

Datum: 2026-09-24

## Umfang

Dieser Android-Stand konzentriert sich auf schnellen Home-Start, stabile BigHero-Metadaten, Continue Watching und reduzierte CloudSync-/History-Last.

## Home-Start

- Der lokale Home-Kategoriencache wird vor dem Netzwerk-Refresh koordiniert geladen.
- Der erste Continue-Watching-Pass bleibt cache-only.
- Staffel-, Episoden-ID-, Rating- und Provider-Abfragen werden aus dem kritischen Startup-Fenster herausgehalten.
- Der teure Fresh-Pass startet erst nach der Startup-Settle-Phase.
- Die erste Fresh-Anreicherung ist auf das sichtbare Continue-Watching-Item begrenzt; weitere Items werden bei Fokus geladen.
- Continue Watching wird als initialer Hero bevorzugt, wenn ein echtes CW-Item vorhanden ist.

## BigHero-Stabilität

- Wiederholte Trailer-Abfragen für denselben Hero werden zusammengeführt und pro Home-Lauf nur einmal aufgelöst.
- Ein vorhandener Trailer-Key wird während Hintergrund-Hydration nicht auf `null` gesetzt.
- Teilweise und vollständige Hero-Snapshots überschreiben keine bereits vorhandenen Budget-, FSK-, Rating-, Provider- oder Artwork-Felder mit leeren Werten.
- Kategorie-, Watched-Badge-, IPTV- und Skeleton-Refreshes bewahren den aktuellen Hero und seine Metadaten.
- Partielle Cachedetails werden ohne neuen Hero-Übergang angezeigt; vollständige Details ergänzen sie in place.

## IPTV Home

- Favorite-TV- und Recent-TV-Artwork wärmt die ersten sechs sichtbaren Items pro Reihe.
- Artwork-Warmup ist auf zwei parallele Requests begrenzt.
- EPG bleibt cache-first und wird separat aktualisiert.

## CloudSync und History

- SSE-Pulls werden auf mindestens drei Sekunden Abstand begrenzt und bei Bursts zusammengeführt.
- Identische semantische Payloads werden trotz neuer Backend-Revision nicht erneut angewendet.
- `updatedAt` und `revision` sind nicht Teil des semantischen Payload-Hashes.
- Account-Snapshot-Restores leeren nicht mehr den separaten `/watch-history`-Cache.
- Parallele Watch-History-Aufrufer teilen einen laufenden Request.
- Account-Sync-Events lösen gebündelte Home-/Continue-Watching-Refreshes aus.

## Skip Intro/Recap/Credits

- IntroDB `post_credits` wird als Credits-Segment unterstützt.
- Debug-Logs zeigen Skip-Anfrage, aufgelöste Intervalle und aktives Zeitfenster.
- Getestete Referenz: Game of Thrones S1E1/S1E2 mit Intro- und Credits-Markern.

## Validierung

- `:app:compileSideloadDebugKotlin` erfolgreich.
- `:app:assembleSideloadDebug` erfolgreich.
- `git diff --check` sauber, abgesehen von bestehenden LF/CRLF-Hinweisen einzelner Kotlin-Dateien.
- Referenzlog `test30.log`: Startup ca. 3,4 s, Continue Watching/CloudSync funktional, identische Cloud-Payloads werden übersprungen, IPTV-Backdrop-Treffer sichtbar.

## Bekannte Rest-Risiken

- Emulator-/Android-Installationslogs können zusätzliche PackageManager-/JIT-/GPU-Jank-Ereignisse erzeugen.
- Große Compose-Methoden und `CloudSyncRepository.applyCloudPayload` können beim ersten JIT-Lauf weiterhin kurze Render-Spikes verursachen.
- Die vollständige Fresh-Metadatenanreicherung läuft bewusst später, damit der erste Home-Render schnell und stabil bleibt.
