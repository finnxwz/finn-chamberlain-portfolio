import base64
import importlib.util
import json
import tempfile
import unittest
import zipfile
from pathlib import Path
from unittest.mock import patch

SPEC = importlib.util.spec_from_file_location("gallery_build", Path(__file__).with_name("build_gallery.py"))
builder = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(builder)
PNG = base64.b64decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aD1sAAAAASUVORK5CYII=")
UUID = "12345678-1234-4234-8234-123456789abc"


class GalleryBuildTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.photos = self.root / "galerie" / "fotos"
        self.photos.mkdir(parents=True)

    def test_manifest_and_archive_include_same_original_files(self):
        (self.photos / f"{UUID}__portrait.png").write_bytes(PNG)
        nested = self.photos / "Serie 2"
        nested.mkdir()
        (nested / "Blick & Nähe.png").write_bytes(PNG)
        (self.photos / ".gitkeep").touch()
        manifest = builder.build_gallery(self.root)
        self.assertEqual(len(manifest["photos"]), 2)
        self.assertIn("portrait.png", [photo["name"] for photo in manifest["photos"]])
        self.assertIn("fotos/Serie%202/Blick%20%26%20N%C3%A4he.png", [photo["path"] for photo in manifest["photos"]])
        archive = self.root / "galerie" / manifest["archive"]["path"]
        with zipfile.ZipFile(archive) as bundle:
            self.assertIsNone(bundle.testzip())
            self.assertEqual(len(bundle.namelist()), 2)
            for name in bundle.namelist():
                self.assertEqual(bundle.read(name), PNG)
                self.assertNotIn("/", name)
        stored = json.loads((self.root / "galerie" / "manifest.json").read_text(encoding="utf-8"))
        self.assertEqual(stored, manifest)
        self.assertEqual(manifest["archive"]["size"], archive.stat().st_size)

    def test_empty_gallery_removes_old_zip(self):
        (self.root / "galerie" / "alle-fotos.zip").write_bytes(b"old")
        manifest = builder.build_gallery(self.root)
        self.assertEqual(manifest["photos"], [])
        self.assertIsNone(manifest["archive"])
        self.assertFalse((self.root / "galerie" / "alle-fotos.zip").exists())

    def test_identical_display_names_have_distinct_archive_names(self):
        (self.photos / f"{UUID}__portrait.png").write_bytes(PNG)
        (self.photos / "87654321-1234-4234-8234-123456789abc__portrait.png").write_bytes(PNG)
        builder.build_gallery(self.root)
        with zipfile.ZipFile(self.root / "galerie" / "alle-fotos.zip") as bundle:
            self.assertEqual(len(set(bundle.namelist())), 2)

    def test_rejects_non_images_and_wrong_extensions(self):
        for name, content in [("fake.jpg", b"not a photo"), ("fake.jpg", PNG), ("page.html", b"<html>"), ("empty.png", b"")]:
            with self.subTest(name=name, content=content[:5]):
                path = self.photos / name
                path.write_bytes(content)
                with self.assertRaises(ValueError):
                    builder.build_gallery(self.root)
                path.unlink()

    def test_gallery_limit_stops_oversized_build(self):
        (self.photos / "portrait.png").write_bytes(PNG)
        with patch.object(builder, "MAX_GALLERY_BYTES", 1):
            with self.assertRaisesRegex(ValueError, "400 MB"):
                builder.build_gallery(self.root)

    def test_site_copies_public_files_only_and_rebuilds_manifest(self):
        (self.root / "index.html").write_text("Portfolio", encoding="utf-8")
        (self.root / "CNAME").write_text("example.com", encoding="utf-8")
        (self.root / "secret.txt").write_text("not public", encoding="utf-8")
        (self.root / "galerie" / ".secret").write_text("not public", encoding="utf-8")
        (self.root / "galerie" / "manifest.json").write_text("stale", encoding="utf-8")
        (self.photos / "portrait.png").write_bytes(PNG)
        manifest = builder.build_site(self.root, self.root / "_site")
        self.assertEqual(len(manifest["photos"]), 1)
        self.assertTrue((self.root / "_site" / "CNAME").is_file())
        self.assertFalse((self.root / "_site" / "secret.txt").exists())
        self.assertFalse((self.root / "_site" / "galerie" / ".secret").exists())
        (self.photos / "portrait.png").unlink()
        builder.build_site(self.root, self.root / "_site")
        self.assertFalse((self.root / "_site" / "galerie" / "alle-fotos.zip").exists())

    def test_cannot_replace_source_directory(self):
        (self.root / "keep.txt").write_text("keep", encoding="utf-8")
        with self.assertRaises(ValueError):
            builder.build_site(self.root, self.root)
        self.assertTrue((self.root / "keep.txt").is_file())


if __name__ == "__main__":
    unittest.main()
