# Finn Chamberlain — Portfolioentwurf

Eine statische Webseite. Die Portfolioseiten funktionieren ohne Installation; die Kundengalerie verwendet einen Build für Fotoverzeichnis und ZIP. Die Stockfotos auf der Brands-Seite werden extern von Pexels geladen und benötigen eine Internetverbindung.

## Ansehen

`index.html` im Browser öffnen. Die Navigation funktioniert auch direkt über lokale Dateien.

**Für die neue Galerie:** `vorschau-starten.cmd` starten. Die Galerie benötigt einen lokalen HTTP-Server und funktioniert nicht über `file://`. Der Starthelfer baut auch das Fotoverzeichnis und den ZIP-Download.

- `index.html`: Portfolio als Startseite mit dreispaltigem Bildraster
- `brands.html`: Projektübersicht mit großen Querformatbildern, Unternehmensnamen, Standorten und direkt sichtbaren Bildserien
- `about.html`: persönliches Porträt, Über mich, Publikationen und Kontaktbereich
- `styles.css`: gemeinsames Design und mobile Layouts
- `script.js`: aktuelle Jahreszahl
- `galerie/`: einfache Passwortgalerie mit fünf Beispielfotos, Bildansicht, Kunden-Seitenleiste mit Dateiinformationen, ZIP-Download und Browser-Upload unter `galerie/admin/`
- `.github/workflows/pages.yml`: automatischer GitHub-Pages-Build und Deployment
- `scripts/build_gallery.py`: statische Website, Fotoverzeichnis und ZIP erzeugen

Die vollständige GitHub-Einrichtung, der Admin-Upload und die Domain-Verknüpfung sind in **[galerie/README.md](galerie/README.md)** beschrieben. Das vereinbarte Galeriepasswort ist als Prüfwert konfiguriert. Es handelt sich um eine statische Passwortabfrage; die Fotos bleiben technisch öffentlich. Ein GitHub-Token für Uploads wird ausschließlich auf der Admin-Seite eingegeben und nicht gespeichert.

## Stand des Entwurfs

Die Gestaltung orientiert sich eng am Screenshot der bisherigen Webseite: weißer Hintergrund (#ffffff), fast schwarzer Kopfbereich (#111111), zentrierter fetter Serifenschriftzug und gleichmäßige Bildreihen mit drei Spalten. Auf kleineren Bildschirmen wechselt das Raster zu zwei beziehungsweise einer Spalte.

Brands zeigt zwei ausdrücklich fiktive Projekte: „Blackthorn Atelier“ (Tattoo-Studio, Berlin) und „Marlow & Sons“ (Kleidungsladen, Hamburg). Jeder Beitrag enthält sechs unterschiedliche, zusammengehörige Stockfotografien. Links stehen die beim Scrollen mitlaufenden Projektinformationen, rechts eine Fotostrecke mit großen Querformaten und Bildpaaren. Mobil stehen die Projektinformationen oberhalb der Bilder. Ein kleiner Projektindex springt direkt zum gewünschten Beitrag. Überschriften verwenden dieselbe serifenlose Schrift wie Navigation und Serienangaben; die Serifenschrift ist dem Namensschriftzug vorbehalten.

Die eigenen Fotos werden direkt aus `fotos/` geladen. Die Originaldateien wurden nicht bearbeitet.

- Portfolio: `DSC01236.jpg`, `DSC01363.jpg`, `DSC01395-fertig.jpg` und `DSC01354.jpg` bilden zwei dreispaltige Reihen der Orangerie-Serie. Pro Reihe wird ein Porträt einmal wiederholt. Auf mobilen Geräten werden die Wiederholungen ausgeblendet. `DSC00937.jpg` schließt dieselbe Serie im originalen Querformat ab.
- Portfolio, zweite Serie: „Tokygo Ghetto“, Standort Tokyo, mit `bild3.jpg` und `bild4.jpg`. Jedes Foto erscheint dreimal in einer eigenen Reihe; mobil werden die Wiederholungen ausgeblendet. Das 4:5-Format entspricht weitgehend den Originalbildern.
- Brands: externe Stockfotos für die beiden fiktiven Unternehmen, keine eigenen Referenzarbeiten.
- Über mich: größeres Porträt aus `ich.jpg` neben einem persönlichen Textentwurf im Blocksatz mit automatischer deutscher Silbentrennung. Der Text greift die Nutzervorgabe „Fotografie in dritter Generation“ und die Richtung Porträt, High Fashion, Editorial und Cinematic auf. Darunter folgen Publikationen als breites Verzeichnis und der Kontaktbereich. Die Publikationen „Stillframe Journal“, „Afterhours Paper“ und „Form & Figure“ samt Jahren, Ausgaben und Beiträgen sind ausdrücklich fiktive Platzhalter.

Der Orangerie-Serientitel stammt aus dem Screenshot; „Tokygo Ghetto“ und Tokyo wurden vom Nutzer vorgegeben. Schriften werden lokal vom Betriebssystem verwendet; dadurch kann die Darstellung zwischen Geräten leicht variieren.

### Stockfoto-Quellen für den Entwurf

- Tattoo-Session: Pexels-Fotos 4125664, 4125660, 4125666, 4125659, 4125661, 4125667.
- Kleidungsladen-Shooting: Pexels-Fotos 6069560, 6069559, 6069563, 6069552, 6069561, 6069562.

Die vollständigen Bild-URLs sind direkt in `brands.html` eingetragen. Alle zwölf Motive wurden für die Layoutauswahl gesichtet. Es werden keine wiederholten Ausschnitte als zusätzliche Fotos verwendet.

## Nächste gemeinsame Schritte

1. Bildauswahl und Wiederholungen abstimmen; für die Veröffentlichung passende Bildgrößen und Webformate erstellen.
2. Fiktive Brands-Projekte und Stockfotos durch tatsächliche Business-Serien ersetzen.
3. Persönlichen Textentwurf abstimmen; echte Publikationen mit Jahr und Links, Region und Kontaktmöglichkeit ergänzen.
4. Angaben für Impressum und Datenschutz klären und entsprechende Seiten vor der Veröffentlichung ergänzen.
5. Finale Schrift, Domain und Hosting abstimmen.

Die aktuelle Fassung ist zur Designabstimmung gedacht und enthält noch keine Kontaktadresse oder rechtlichen Angaben.
