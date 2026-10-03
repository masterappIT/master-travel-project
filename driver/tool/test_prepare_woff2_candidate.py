import contextlib
import hashlib
import io
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from fontTools.ttLib import TTFont

import prepare_woff2_candidate as tool


class CandidateTests(unittest.TestCase):
    def test_repository_output_rejected(self):
        with self.assertRaisesRegex(ValueError, "outside the repository"):
            tool.prepare(tool.DRIVER / "woff2-candidate")

    def test_existing_output_preserved(self):
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory)
            marker = output / "keep.txt"
            marker.write_text("keep")
            with self.assertRaisesRegex(ValueError, "already exists"):
                tool.prepare(output)
            self.assertEqual(marker.read_text(), "keep")

    def test_failure_cleans_only_candidate(self):
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / "candidate"
            with patch.object(tool, "TTFont", side_effect=RuntimeError("conversion failed")):
                with self.assertRaisesRegex(RuntimeError, "conversion failed"):
                    tool.prepare(output)
            self.assertFalse(output.exists())
            self.assertTrue(Path(directory).exists())

    def test_changed_metrics_rejected(self):
        source = tool.DRIVER / "assets/fonts/NotoSansTC-Regular.ttf"
        with TTFont(source) as original, TTFont(source) as changed:
            glyph = changed.getGlyphOrder()[0]
            width, bearing = changed["hmtx"].metrics[glyph]
            changed["hmtx"].metrics[glyph] = (width + 1, bearing)
            with self.assertRaisesRegex(ValueError, "horizontal_metrics"):
                tool.verify(original, changed)

    def test_full_conversion_preserves_source(self):
        sources = [tool.DRIVER / "pubspec.yaml"] + [
            tool.DRIVER / f"assets/fonts/NotoSansTC-{name}.ttf" for name in tool.WEIGHTS]
        before = {path: hashlib.sha256(path.read_bytes()).hexdigest() for path in sources}
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / "candidate"
            with contextlib.redirect_stdout(io.StringIO()):
                tool.prepare(output)
            report = json.loads((output / "font-verification.json").read_text())
            self.assertEqual(len(report), 5)
            manifest = (output / "driver/pubspec.yaml").read_text()
            for result in report:
                self.assertTrue(all(result["checks"].values()))
                self.assertGreater(result["glyphs"], 0)
                self.assertLess(result["woff2_bytes"], result["gzip_bytes"])
                self.assertIn(f'NotoSansTC-{result["name"]}.woff2', manifest)
                self.assertNotIn(f'asset: assets/fonts/NotoSansTC-{result["name"]}.ttf', manifest)
                self.assertEqual(result["weight"], tool.WEIGHTS[result["name"]])
        self.assertEqual(before, {path: hashlib.sha256(path.read_bytes()).hexdigest() for path in sources})


if __name__ == "__main__":
    unittest.main()
