"""Copy the selected locally installed typefaces into the website's font folder."""

import argparse
from pathlib import Path
import shutil


def import_fonts(source, root):
    selected = {
        "Gazpacho-Regular.otf": "gazpacho-regular.otf",
        "Gazpacho-Bold.otf": "gazpacho-bold.otf",
        "Poppins-Light.ttf": "poppins-light.ttf",
    }
    for name in selected:
        if not (source / name).is_file():
            raise FileNotFoundError(f"Schriftdatei nicht gefunden: {source / name}")
    destination = root / "fonts"
    destination.mkdir(parents=True, exist_ok=True)
    for original, filename in selected.items():
        src, target = source / original, destination / filename
        if target.exists():
            if target.read_bytes() != src.read_bytes():
                raise FileExistsError(f"Vorhandene abweichende Schriftdatei wird nicht überschrieben: {target}")
        else:
            shutil.copy2(src, target)
        print(f"{filename}: {target.stat().st_size:,} Bytes")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, default=Path.home() / "AppData/Local/Microsoft/Windows/Fonts")
    args = parser.parse_args()
    import_fonts(args.source, Path(__file__).resolve().parents[1])
