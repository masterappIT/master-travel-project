#!/usr/bin/env python3
"""Verify a candidate Flutter build packages exactly the five verified WOFF2 fonts."""
import argparse
import hashlib
import json
from pathlib import Path

from prepare_woff2_candidate import WEIGHTS


def verify_build(output):
    report = json.loads((output / "font-verification.json").read_text())
    web = output / "driver/build/web"
    manifest = json.loads((web / "assets/FontManifest.json").read_text())
    family = [entry for entry in manifest if entry["family"] == "Noto Sans TC"]
    expected = {(f"assets/fonts/NotoSansTC-{name}.woff2", weight)
                for name, weight in WEIGHTS.items()}
    if len(family) != 1 or len(family[0]["fonts"]) != 5 or {
        (font["asset"], font["weight"]) for font in family[0]["fonts"]
    } != expected:
        raise ValueError("Unexpected NotoSansTC build manifest")
    if len(report) != 5 or {entry["name"] for entry in report} != set(WEIGHTS):
        raise ValueError("Unexpected font verification report")
    for entry in report:
        if not entry["checks"] or not all(entry["checks"].values()):
            raise ValueError(f'Failed conversion checks: {entry["name"]}')
        name = f'NotoSansTC-{entry["name"]}'
        source = output / f"driver/assets/fonts/{name}.ttf"
        asset = web / f"assets/assets/fonts/{name}.woff2"
        if hashlib.sha256(source.read_bytes()).hexdigest() != entry["source_sha256"]:
            raise ValueError(f"Source changed after conversion: {name}")
        if hashlib.sha256(asset.read_bytes()).hexdigest() != entry["woff2_sha256"]:
            raise ValueError(f"Built font differs from verified font: {name}")
    print("PASS: five weights and built font hashes match the verified candidate")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True)
    verify_build(parser.parse_args().output.resolve())
