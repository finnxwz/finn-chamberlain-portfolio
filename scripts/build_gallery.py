"""Build the static Pages artifact, photo manifest and downloadable ZIP. No dependencies."""

import argparse
import csv
import hashlib
import json
import re
import shutil
import zipfile
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import quote

EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
MAX_PHOTO_BYTES = 20 * 1024 * 1024
MAX_GALLERY_BYTES = 400 * 1024 * 1024
MAX_SITE_BYTES = 900 * 1024 * 1024
PUBLIC_FILES = ("index.html", "about.html", "brands.html", "contact.html", "legal.html", "impressum.html", "datenschutz.html", "cookie-richtlinie.html", "styles.css", "script.js", "image-protection.js", "foto-daten.csv", "foto-daten.js", "CNAME", "robots.txt", "favicon.ico")
PUBLIC_FOLDERS = ("fotos", "fonts", "galerie", "resources", "logo")
UPLOAD_PREFIX = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}__", re.I)


def valid_photo(path):
    with path.open("rb") as source:
        signature = source.read(12)
    extension = path.suffix.lower()
    if extension in {".jpg", ".jpeg"}:
        return signature.startswith(b"\xff\xd8\xff")
    if extension == ".png":
        return signature.startswith(b"\x89PNG\r\n\x1a\n")
    return extension == ".webp" and signature[:4] == b"RIFF" and signature[8:12] == b"WEBP"


def build_gallery(site, *, create_archive=True):
    gallery = site / "galerie"
    photos_folder = gallery / "fotos"
    photos_folder.mkdir(parents=True, exist_ok=True)
    entries = []
    total = 0
    for path in sorted(photos_folder.rglob("*"), key=lambda item: item.as_posix().casefold()):
        relative = path.relative_to(photos_folder)
        if path.is_symlink():
            raise ValueError(f"Symlinks sind im Fotoordner nicht erlaubt: {relative}")
        if not path.is_file() or any(part.startswith(".") for part in relative.parts):
            continue
        if path.suffix.lower() not in EXTENSIONS:
            raise ValueError(f"Nicht unterstützte Datei im Fotoordner: {relative}")
        size = path.stat().st_size
        if not size or size > MAX_PHOTO_BYTES or not valid_photo(path):
            raise ValueError(f"Ungültige Bilddatei oder größer als 20 MB: {relative}")
        total += size
        if total > MAX_GALLERY_BYTES:
            raise ValueError("Die Galerie überschreitet 400 MB. Bitte ältere Fotos entfernen oder die Auswahl verkleinern.")
        with path.open("rb") as source:
            version = hashlib.file_digest(source, "sha256").hexdigest()[:16]
        entries.append({
            "name": UPLOAD_PREFIX.sub("", path.name),
            "path": "fotos/" + quote(relative.as_posix(), safe="/"),
            "size": size,
            "version": version,
            "source": path,
        })

    archive_path = gallery / "alle-fotos.zip"
    archive = None
    if entries and create_archive:
        # JPEG/PNG/WebP sind bereits komprimiert. ZIP_STORED vermeidet unnötige CPU-Arbeit.
        with zipfile.ZipFile(archive_path, "w", compression=zipfile.ZIP_STORED) as bundle:
            for index, entry in enumerate(entries, start=1):
                # Laufende Nummern verhindern Überschreiben gleichnamiger Uploads beim Entpacken.
                bundle.write(entry["source"], arcname=f"{index:04d}-{entry['name']}")
        archive = {"path": "alle-fotos.zip", "size": archive_path.stat().st_size}
    elif archive_path.exists():
        archive_path.unlink()

    manifest = {
        "version": 1,
        "updatedAt": datetime.now(timezone.utc).isoformat(),
        "photos": [{key: value for key, value in entry.items() if key != "source"} for entry in entries],
        "archive": archive,
    }
    (gallery / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return manifest


def copy_public_tree(source, destination):
    destination.mkdir(parents=True, exist_ok=True)
    for path in source.rglob("*"):
        relative = path.relative_to(source)
        if any(part.startswith(".") for part in relative.parts) or path.name in {"README.md", "manifest.json", "alle-fotos.zip"}:
            continue
        if path.is_symlink():
            raise ValueError(f"Symlinks sind im öffentlichen Ordner nicht erlaubt: {path}")
        target = destination / relative
        if path.is_dir():
            target.mkdir(parents=True, exist_ok=True)
        elif path.is_file():
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(path, target)


def generate_photo_metadata(root):
    source = root / "foto-daten.csv"
    metadata = {}
    if source.is_file():
        with source.open(encoding="utf-8-sig", newline="") as stream:
            reader = csv.DictReader(stream, delimiter=";", strict=True)
            reader.fieldnames = [name.strip() for name in reader.fieldnames or []]
            if not {"Dateiname", "Model", "Location"}.issubset(reader.fieldnames or []):
                raise ValueError("foto-daten.csv benötigt die Spalten Dateiname, Model und Location.")
            for row in reader:
                filename = (row.get("Dateiname") or "").strip()
                if filename:
                    metadata[filename] = {
                        "model": (row.get("Model") or "").strip(),
                        "location": (row.get("Location") or "").strip(),
                    }
    script = "// Automatisch aus foto-daten.csv erzeugt. Bitte die CSV bearbeiten.\n"
    script += "window.FINN_PHOTO_METADATA = " + json.dumps(metadata, ensure_ascii=False, indent=2) + ";\n"
    (root / "foto-daten.js").write_text(script, encoding="utf-8")


def build_site(root, output):
    root, output = root.resolve(), output.resolve()
    # Nur das dafür vorgesehene Build-Verzeichnis darf ersetzt werden.
    if output != root / "_site":
        raise ValueError("Das Ausgabeverzeichnis muss _site direkt im Projektordner sein.")
    generate_photo_metadata(root)
    output.mkdir(parents=True, exist_ok=True)
    # Das Verzeichnis selbst behalten: Eine laufende lokale Vorschau kann es als cwd verwenden.
    for old in output.iterdir():
        if old.is_dir() and not old.is_symlink():
            shutil.rmtree(old)
        else:
            old.unlink()
    for name in PUBLIC_FILES:
        source = root / name
        if source.is_symlink():
            raise ValueError(f"Symlink nicht erlaubt: {name}")
        if source.is_file():
            shutil.copy2(source, output / name)
    for name in PUBLIC_FOLDERS:
        source = root / name
        if source.is_dir():
            if source.is_symlink():
                raise ValueError(f"Symlink nicht erlaubt: {name}")
            copy_public_tree(source, output / name)
    manifest = build_gallery(output, create_archive=False)
    published_bytes = sum(path.stat().st_size for path in output.rglob("*") if path.is_file())
    if published_bytes > MAX_SITE_BYTES:
        raise ValueError("Die erzeugte Webseite ist größer als 900 MB. Bitte die Bildauswahl verkleinern.")
    print(f"Pages-Build: {len(manifest['photos'])} Galeriefotos, {published_bytes / 1024 / 1024:.1f} MB, ohne öffentliche ZIP-Downloads.")
    return manifest


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1])
    args = parser.parse_args()
    build_site(args.root, args.root / "_site")
