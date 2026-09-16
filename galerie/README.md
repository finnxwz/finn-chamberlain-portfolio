# Galerie auf GitHub Pages

## Was fertig vorbereitet ist

- `/galerie/`: Passwortabfrage, Fotoübersicht, vergrößerte Bildansicht und Download aller Fotos als ZIP.
- Kunden-Seitenleiste mit Anzahl, Gesamtgröße, ZIP-Größe, Dateiformaten, Größenbereich einzelner Dateien und Stand der Galerie. Die Angaben werden aus dem aktuellen Fotoverzeichnis berechnet; pro Bild werden Dateiname und Größe angezeigt.
- Ab 761 Pixeln Fensterbreite sitzt die Seitenleiste fest in der linken Layoutspalte. Auf kleineren Displays öffnet „Downloads & Galerie-Infos“ dieselbe Leiste seitlich als Dialog; die Bilder werden nicht von einem langen Infoblock nach unten verschoben.
- Das vereinbarte Galeriepasswort ist als SHA-256-Prüfwert in `config.js` hinterlegt. Es wird nicht im Klartext dokumentiert.
- `/galerie/admin/`: Browser-Upload direkt in dein GitHub-Repository.
- Ein GitHub-Actions-Workflow erstellt nach Änderungen das Fotoverzeichnis und die ZIP-Datei und veröffentlicht die Website.
- Die Fotodateien und die ZIP bleiben technisch öffentlich. Die statische Passwortabfrage ist eine einfache Zugangshürde, keine echte Zugriffskontrolle. `noindex` ist eine Bitte an Suchmaschinen, kein Zugriffsschutz.

## 1. Repository und kostenlose Pages-Veröffentlichung

1. Erstelle ein **öffentliches** GitHub-Repository und lade den gesamten Projektinhalt hoch, einschließlich `.github/workflows/pages.yml` und `scripts/`. Die Dateien müssen im Repository-Hauptverzeichnis liegen, nicht in einem zusätzlichen Projekt-Unterordner.
2. Öffne **Settings → Pages → Build and deployment → Source → GitHub Actions**.
3. Unter **Actions → Publish portfolio and gallery → Run workflow** kannst du den ersten Build starten. Nach späteren Änderungen am Standardbranch startet er automatisch.
4. Warte, bis der Workflow vollständig grün ist. Die Pages-Adresse wird in Settings → Pages angezeigt.

Auf einer Projektadresse lautet die Galerie beispielsweise `https://BENUTZER.github.io/REPOSITORY/galerie/`. Nach Verknüpfung deiner Domain ist sie unter `https://deinedomain.de/galerie/` erreichbar. GitHub leitet `/galerie` auf die Verzeichnisadresse mit abschließendem Schrägstrich um.

### Eigene Domain

Trage sie unter **Settings → Pages → Custom domain** ein und richte die von GitHub beschriebenen DNS-Einträge bei deinem Domainanbieter ein. Aktiviere **Enforce HTTPS**, sobald das Zertifikat bereitsteht. Eine `CNAME`-Datei im Projekt-Hauptverzeichnis wird vom Build mitgenommen, falls du eine verwendest.

## 2. Browser-Upload

1. Öffne bei GitHub **Settings → Developer settings → Personal access tokens → Fine-grained tokens**.
2. Erstelle einen Token mit begrenzter Laufzeit. Unter **Repository access** wählst du ausschließlich dieses Repository.
3. Unter **Repository permissions**: **Contents → Read and write**. Der automatisch enthaltene Lesezugriff auf Metadata bleibt bestehen. Keine Workflow-Schreibrechte erforderlich.
4. Öffne `/galerie/admin/`, gib `BENUTZER/REPOSITORY` und den Token ein und klicke auf **Mit GitHub verbinden**.
5. Wähle die Fotos aus und klicke auf **Fotos veröffentlichen**. Der Upload fügt alle ausgewählten Fotos in einem Commit hinzu. Danach baut GitHub Pages die Galerie und die ZIP neu.
6. Über **Veröffentlichung bei GitHub prüfen** siehst du den tatsächlichen Build-Status. Erst nach erfolgreichem Abschluss erscheinen die Fotos in der veröffentlichten Galerie. Dort gegebenenfalls **Aktualisieren** anklicken.

Der Token wird nur im Arbeitsspeicher des Tabs gehalten. **Verbindung trennen** oder das Schließen/Neuladen des Tabs verwirft ihn. Er darf niemals in `config.js`, Dateien oder Commits stehen. Das Galeriepasswort ist kein Upload-Zugang. Ein Branchschutz, der direkte Commits verbietet, muss Browser-Uploads über deinen Benutzer zulassen.

Optional kannst du in `galerie/config.js` das öffentliche Feld `repository` vorausfüllen. Auf einer `github.io`-Adresse wird es ansonsten automatisch vorgeschlagen; bei einer eigenen Domain trägst du es selbst ein. `branch` sollte leer bleiben, damit der Standardbranch automatisch verwendet wird.

## 3. Fotos und Downloads

- Galerie-Fotos liegen in **`galerie/fotos/`**, getrennt vom öffentlichen Portfolio-Ordner `fotos/`.
- JPG/JPEG, PNG und WebP; bis zu **20 MB pro Datei** und **100 Fotos pro Browser-Upload**.
- Die Galerie enthält fünf Beispielfotos der Orangerie-Serie (`Orangerie-01-Portraet.jpg` bis `Orangerie-05-Architektur.jpg`). Es sind unveränderte Kopien der bereitgestellten Fotos. Du kannst sie später direkt aus `galerie/fotos/` löschen oder durch Kundenbilder ersetzen. Der Build fügt entfernte Beispiele nicht automatisch wieder hinzu.
- `python scripts/seed_gallery.py` kann die Beispielauswahl bei Bedarf erneut anlegen, ohne vorhandene Dateien zu überschreiben.
- Du kannst Fotos auch direkt über GitHub in diesen Ordner laden. Ein neuer Commit löst denselben Build aus.
- Browser-Uploads erhalten eindeutige Dateinamen. Dateien mit gleichem ursprünglichem Namen überschreiben sich nicht.
- Zum Entfernen lösche die entsprechenden Dateien im Repository unter `galerie/fotos/` und committe die Änderung. Die nächste Veröffentlichung entfernt sie aus der aktuellen Galerie und der aktuellen ZIP; ältere Git-Commits bleiben erhalten.
- ZIP und `manifest.json` werden nur im Build-Verzeichnis `_site/galerie/` erzeugt. Nicht manuell bearbeiten und die ZIP nicht in Git committen.
- ZIP enthält die Originaldateien, ohne zusätzliche Bildkompression. Nummerierte Dateinamen im ZIP verhindern Namenskollisionen.
- Der Build begrenzt die Galerie auf **400 MB Originaldateien** und die erzeugte Website inklusive ZIP auf **900 MB**, damit die Ausgabe unter dem 1-GB-Limit von GitHub Pages bleibt. GitHub ist damit für eine kleine Galerie geeignet; vorhandene GitHub-Speicher-, Traffic- und Actions-Limits gelten weiterhin.

## 4. Lokale Vorschau unter Windows

**Nicht per `file://` öffnen.** JavaScript-Module und das Laden des JSON-Fotoverzeichnisses benötigen einen HTTP-Server.

Starte **`vorschau-starten.cmd`** im Projekt-Hauptverzeichnis. Der Helfer:

1. lädt bei Bedarf einmalig die portable Python-Laufzeit von `python.org` in den temporären Ordner, ohne systemweite Installation;
2. baut die Website, das Fotoverzeichnis und die ZIP;
3. startet einen nur lokal erreichbaren HTTP-Server und öffnet die Galerie im Browser.

Das Konsolenfenster muss offen bleiben. Nach Änderungen oder neuen lokalen Fotos die Vorschau neu starten, damit `_site` neu gebaut wird. Auf der lokalen Admin-Seite gehen Uploads ebenfalls an das eingegebene GitHub-Repository, nicht in den lokalen Ordner.

Mit installiertem Python geht es alternativ im Projekt-Hauptverzeichnis:

```sh
python scripts/build_gallery.py
python -m http.server 8765 --bind 127.0.0.1 --directory _site
```

Danach `http://127.0.0.1:8765/galerie/` öffnen.

## Passwort ändern

In der Browser-Entwicklerkonsole auf einer HTTPS-Seite oder localhost:

```js
Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode("NEUES-PASSWORT"))), b => b.toString(16).padStart(2, "0")).join("")
```

Das Ergebnis als `passwordSha256` in `galerie/config.js` eintragen und committen. Bereits freigeschaltete Tabs merken sich die Freigabe bis zu acht Stunden. Da die Dateien ohnehin öffentlich sind, ist auch der Hash keine Absicherung vertraulicher Inhalte.

## Prüfungen

```sh
python -m unittest discover -s scripts -p "test_*.py"
node --test scripts/gallery.test.mjs
```

Benötigt Python 3.11+ und Node.js 22+. Beide Prüfungen laufen vor jeder Veröffentlichung automatisch in GitHub Actions.
