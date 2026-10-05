# Finn Chamberlain — Portfolioentwurf

Eine statische Webseite. Die Portfolioseiten funktionieren ohne Installation; die Kundengalerie verwendet einen Build für das Fotoverzeichnis. Die Bilder für Portfolio und For Brands werden lokal geladen.

## Ansehen

`index.html` im Browser öffnen. Die Navigation funktioniert auch direkt über lokale Dateien.

**Für die Galerie:** `vorschau-starten.cmd` starten. Die Galerie benötigt einen lokalen HTTP-Server und funktioniert nicht über `file://`. Der Starthelfer baut auch das Fotoverzeichnis.

- `index.html`: Portfolio mit vier gleich breiten Bildspalten und einer Lightbox
- `brands.html`: For Brands mit zwei Platzhalter-Brands und Vier-Spalten-Kompositionen
- `about.html`: editorialer Textbereich links mit Versace-Zitat, bestehendem Blogtext, Signatur und drei Publikationen; Porträt rechts mit drei persönlichen Notizen
- `contact.html`: nicht scrollbare Kontaktseite mit E-Mail, Instagram und Hintergrundfoto
- `impressum.html`, `datenschutz.html`, `cookie-richtlinie.html`: auf die Funktionen abgestimmte Texte mit ausdrücklich offenen Betreiber- und Dienstleisterangaben
- `styles.css`: gemeinsames Design und mobile Layouts
- `fonts/`: selbst gehostete Gazpacho- und Poppins-Light-Schriften
- `script.js`: sanfte Seitenwechsel, scrollabhängiger Header und Lightbox mit Tastatursteuerung
- `image-protection.js`: begrenzt Bild-Kontextmenüs und Drag-and-drop für Fotos, auch nach sanften Seitenwechseln und in der Lightbox
- `galerie/`: einfache Passwortgalerie mit fünf Beispielfotos, Bildansicht, Kunden-Seitenleiste mit Dateiinformationen und Browser-Upload unter `galerie/admin/`; keine Download-Links
- `.github/workflows/pages.yml`: automatischer GitHub-Pages-Build und Deployment
- `scripts/build_gallery.py`: statische Website, Fotoverzeichnis und Foto-Metadaten erzeugen; der öffentliche Build stellt keine ZIP-Datei bereit

Die vollständige GitHub-Einrichtung, der Admin-Upload und die Domain-Verknüpfung sind in **[galerie/README.md](galerie/README.md)** beschrieben. Das vereinbarte Galeriepasswort ist als Prüfwert konfiguriert. Es handelt sich um eine statische Passwortabfrage; die Fotos bleiben technisch öffentlich. Ein GitHub-Token für Uploads wird ausschließlich auf der Admin-Seite eingegeben und nicht gespeichert.

## Stand des Entwurfs

Die Gestaltung verwendet #FFFFFF und #1E1E1E, ein zentriertes SVG-Logo und dieselben Content-Ränder auf allen Seiten. Portfolio und For Brands verwenden identische Spaltenbreiten und Bildabstände. Auf kleineren Bildschirmen wechselt das Raster zu zwei beziehungsweise einer Spalte. Sanfte Seitenwechsel benötigen einen HTTP-Server; bei direkt geöffneten lokalen Dateien bleibt die normale Navigation verfügbar.

For Brands zeigt ausschließlich „Brand 01“ und „Brand 02“ mit Logo- und Kategorie-Platzhaltern. Je Abschnitt stehen ein Hochformat, zwei gestapelte Querformate und zwei weitere Hochformate nebeneinander. Die Querformate werden passend beschnitten, damit ihre Gesamthöhe inklusive Abstand exakt der Hochformathöhe entspricht. „And More“ öffnet weitere Platzhalterbilder in der gemeinsamen Lightbox. Der Abschluss-Button führt zur Kontaktseite.

Die eigenen Fotos werden direkt aus `fotos/` geladen. Die Originaldateien wurden nicht bearbeitet.

- Portfolio: 16 Bildplätze mit vorhandenen, teilweise wiederholten Motiven. Hochformate sind 2:3, Querformate 3:2. Ein Klick öffnet das Originalbild über einer weißen, halbtransparenten Ebene. Der Header bleibt bedienbar. Chevrons und Pfeiltasten wechseln das Bild; X, Escape oder ein Klick auf die freie Fläche schließen die Ansicht. Model und Location werden anhand des Dateinamens aus `foto-daten.csv` zugeordnet. Der Build erzeugt daraus `foto-daten.js` im Projektordner und in `_site`, damit die Daten auch beim direkten Öffnen einer HTML-Datei sofort bereitstehen. Unter HTTP wird die CSV zusätzlich frisch geladen. Auch wiederholte Motive erhalten dieselben Angaben. Nach Änderungen an der CSV die Vorschau neu bauen und die Seite neu laden; `foto-daten.js` wird automatisch aktualisiert und soll nicht von Hand bearbeitet werden. Ohne hinterlegte Daten bleiben Platzhalter sichtbar.
- For Brands: `resources/platzhalter-hoch.png` und `resources/platzhalter-quer.png` füllen die Hoch- beziehungsweise Querformatpositionen und die zusätzlichen Bilder in der Lightbox.
- Über mich: Porträt aus `resources/ich.jpg` rechts neben dem Gianni-Versace-Zitat und unverändertem Blogtext. Drei feine Pfeilnotizen am Foto: „das bin ich“, „liebt kaffee“ und „mag katzen“. Darunter größere persönliche Signatur „Finn Chamberlain“ in Photograph Signature und drei Magazin-Platzhalter mit getrennten Grid-Spalten für Monat, Jahr, Gedankenstrich und Magazin. Es gibt auf dieser Seite keinen „let’s talk“-Link.
- Contact: E-Mail und Instagram-Zeile haben dieselbe Schriftgröße. `resources/hintergrund-aboutme.jfif` ist zurückgenommen und testweise schwarz-weiß. Über `--contact-photo-filter` in `styles.css` kann der Filter angepasst oder mit `none` entfernt werden. Header und Footer bleiben fixiert; auch im mobilen Querformat ist die Seite nicht scrollbar.

### Typografie

Die sichtbare Benutzeroberfläche ist grundsätzlich kleingeschrieben. Lightbox-Inhalte, About-Me-Blogtext, das wörtliche Versace-Zitat samt Autorenangabe und die persönlichen Signaturen behalten ihre vorgesehene Groß-/Kleinschreibung. Header, Footer, Brand-Kategorie und About-Me-Blog verwenden gemeinsam `--bar-font-size` (13 px, mobil 12 px).

Überschriften verwenden **Gazpacho Regular (400)**; der Namensschriftzug ist als SVG eingebunden. Fließtext, Navigation, Formulare und Buttons verwenden **Poppins Light (300)**. **Poppins Semi Bold (600)** wird für E-Mail und Instagram-Account auf Contact sowie die Labels in der Lightbox verwendet. „on Instagram“ und die Lightbox-Platzhalterwerte bleiben Light. Die Schriftdateien liegen in `fonts/` und werden per `@font-face` mit `font-display: swap` geladen. Besucher benötigen keine installierten Schriften. Der Pages-Build übernimmt den Schriftordner und `resources/` automatisch. Die Poppins-Lizenz liegt als `fonts/OFL-Poppins.txt` bei.

`scripts/import_fonts.py` kann die ausgewählten Schriftdateien aus dem lokalen Windows-Schriftordner importieren. Auf GitHub wird dieser Import nicht ausgeführt; dort werden die bereits vorhandenen Dateien aus `fonts/` verwendet.

## Nächste gemeinsame Schritte

1. Bildauswahl und Wiederholungen abstimmen; für die Veröffentlichung passende Bildgrößen und Webformate erstellen.
2. Brand-, Logo-, Kategorie- und Bildplatzhalter durch tatsächliche Referenzen ersetzen.
3. Persönlichen Textentwurf abstimmen; echte Publikationen mit Jahr und Links, Region und Kontaktmöglichkeit ergänzen.
4. Angaben für Impressum und Datenschutz klären und entsprechende Seiten vor der Veröffentlichung ergänzen.
5. Eigene Domain verknüpfen.

Die aktuelle Fassung ist zur Designabstimmung gedacht. Die Kontaktadresse ist eingetragen; Brand-Referenzen sind Platzhalter. In den rechtlichen Texten sind vor allem Betreiberanschrift, bestätigter Hosting-/Maildienst, Aufbewahrungsfristen und Bildfreigaben noch zu ergänzen. Google Analytics ist nicht aktiv, dafür sind eigene Ergänzungsabschnitte vorbereitet.
