"""Add the requested Orangerie sample photos without overwriting existing uploads."""

from pathlib import Path
import shutil


def seed_gallery(root):
    destination = root / "galerie" / "fotos"
    destination.mkdir(parents=True, exist_ok=True)
    examples = {
        "DSC01236.jpg": "Orangerie-01-Portraet.jpg",
        "DSC01363.jpg": "Orangerie-02-Detail.jpg",
        "DSC01395-fertig.jpg": "Orangerie-03-Licht.jpg",
        "DSC01354.jpg": "Orangerie-04-Schmuck.jpg",
        "DSC00937.jpg": "Orangerie-05-Architektur.jpg",
    }
    added = 0
    for source_name, target_name in examples.items():
        source = root / "fotos" / source_name
        target = destination / target_name
        if not source.is_file():
            raise FileNotFoundError(f"Beispielfoto fehlt: {source}")
        if not target.exists():
            shutil.copy2(source, target)
            added += 1
    print(f"{added} Beispielfotos zur Galerie hinzugefügt.")


if __name__ == "__main__":
    seed_gallery(Path(__file__).resolve().parents[1])
