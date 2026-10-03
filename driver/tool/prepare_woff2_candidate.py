#!/usr/bin/env python3
"""Create an isolated Flutter source copy and verify lossless WOFF2 conversion."""
import argparse
import gzip
import hashlib
import json
import shutil
from pathlib import Path

from fontTools.ttLib import TTFont

DRIVER = Path(__file__).resolve().parents[1]
WEIGHTS = {"Regular": 400, "Medium": 500, "SemiBold": 600, "Bold": 700, "ExtraBold": 800}


def verify(original, converted):
    checks = {
        "cmap": original.getBestCmap() == converted.getBestCmap(),
        "glyph_order": original.getGlyphOrder() == converted.getGlyphOrder(),
        "horizontal_metrics": original["hmtx"].metrics == converted["hmtx"].metrics,
        "outlines": all(original["glyf"][g] == converted["glyf"][g]
                        for g in original.getGlyphOrder()),
        "weight": original["OS/2"].usWeightClass == converted["OS/2"].usWeightClass,
        "tables": set(original.keys()) == set(converted.keys()),
    }
    for tag in original.keys():
        if tag not in {"GlyphOrder", "head", "glyf", "loca", "hmtx"}:
            checks[f"table_{tag}"] = original.getTableData(tag) == converted.getTableData(tag)
    # WOFF2 reconstructs glyph storage, so checksum adjustment is not stable.
    checks["head_metrics"] = all(
        getattr(original["head"], key) == getattr(converted["head"], key)
        for key in ("unitsPerEm", "xMin", "yMin", "xMax", "yMax"))
    failed = [key for key, passed in checks.items() if not passed]
    if failed:
        raise ValueError(f"Font verification failed: {failed}")
    return checks


def prepare(output):
    output = output.resolve()
    repo = DRIVER.parent
    if output == repo or repo in output.parents:
        raise ValueError("Output must be outside the repository")
    if output.exists():
        raise ValueError("Output already exists; use a new directory")
    manifest = (DRIVER / "pubspec.yaml").read_text()
    for name, weight in WEIGHTS.items():
        declarations = [f"asset: assets/fonts/NotoSansTC-{name}.{extension}\n          weight: {weight}"
                        for extension in ("ttf", "woff2")]
        if sum(manifest.count(declaration) for declaration in declarations) != 1:
            raise ValueError(f"Unexpected font declaration: {name}")
    output.mkdir(parents=True)
    try:
        candidate = output / "driver"
        shutil.copytree(DRIVER, candidate, ignore=shutil.ignore_patterns(
            "build", ".dart_tool", ".git", ".idea"))
        report = []
        for name, weight in WEIGHTS.items():
            source = DRIVER / f"assets/fonts/NotoSansTC-{name}.ttf"
            target = candidate / f"assets/fonts/NotoSansTC-{name}.woff2"
            with TTFont(source, recalcTimestamp=False) as font:
                font.flavor = "woff2"
                font.save(target)
                glyph_count = len(font.getGlyphOrder())
            with TTFont(source) as original, TTFont(target) as converted:
                checks = verify(original, converted)
            raw = source.read_bytes()
            report.append({"name": name, "weight": weight,
                           "glyphs": glyph_count,
                           "source_sha256": hashlib.sha256(raw).hexdigest(),
                           "woff2_sha256": hashlib.sha256(target.read_bytes()).hexdigest(),
                           "ttf_bytes": len(raw), "gzip_bytes": len(gzip.compress(raw, compresslevel=6, mtime=0)),
                           "woff2_bytes": target.stat().st_size, "checks": checks})
            manifest = manifest.replace(f"NotoSansTC-{name}.ttf", f"NotoSansTC-{name}.woff2")
        (candidate / "pubspec.yaml").write_text(manifest)
        (output / "font-verification.json").write_text(json.dumps(report, indent=2) + "\n")
        print(json.dumps({"candidate": str(candidate),
                          "gzip_bytes": sum(r["gzip_bytes"] for r in report),
                          "woff2_bytes": sum(r["woff2_bytes"] for r in report)}, indent=2))
    except Exception:
        shutil.rmtree(output)
        raise


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True)
    prepare(parser.parse_args().output)
