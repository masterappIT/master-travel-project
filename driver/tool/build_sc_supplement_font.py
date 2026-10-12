#!/usr/bin/env python3
"""Build the Noto Sans SC supplement font for Driver Web.

The supplement contains only the code points that Noto Sans SC covers and
Noto Sans TC does not, so Simplified Chinese text never falls back to the
remote font-fallback service. Existing Noto Sans TC glyphs are untouched.

Usage (fontTools==4.65.0):
  python3 driver/tool/build_sc_supplement_font.py \
    --tc driver/assets/fonts/NotoSansTC-Variable.ttf \
    --sc /path/to/NotoSansSC[wght].ttf \
    --out driver/assets/fonts/NotoSansSC-Supplement.ttf
"""
import argparse
import hashlib

import fontTools
from fontTools import subset
from fontTools.ttLib import TTFont

EXPECTED_FONTTOOLS = "4.65.0"
# SHA-256 of NotoSansSC[wght].ttf from google/fonts ofl/notosanssc (git blob fb0637ba).
SC_SOURCE_SHA256 = "a3041811a78c361b1de50f953c805e0244951c21c5bd412f7232ef0d899af0da"


def sha256(path):
    with open(path, "rb") as handle:
        return hashlib.sha256(handle.read()).hexdigest()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--tc", required=True)
    parser.add_argument("--sc", required=True)
    parser.add_argument("--out", required=True)
    args = parser.parse_args()

    if fontTools.version != EXPECTED_FONTTOOLS:
        raise SystemExit(f"fontTools {EXPECTED_FONTTOOLS} required, found {fontTools.version}")
    if sha256(args.sc) != SC_SOURCE_SHA256:
        raise SystemExit("Unexpected Noto Sans SC source file")

    tc_codepoints = set(TTFont(args.tc).getBestCmap())
    sc_codepoints = set(TTFont(args.sc).getBestCmap())
    missing = sorted(sc_codepoints - tc_codepoints)

    options = subset.Options()
    options.layout_features = ["*"]
    options.name_IDs = ["*"]
    options.name_languages = ["*"]
    options.notdef_outline = True
    options.glyph_names = False
    font = subset.load_font(args.sc, options)
    subsetter = subset.Subsetter(options)
    subsetter.populate(unicodes=missing)
    subsetter.subset(font)
    subset.save_font(font, args.out, options)

    print(f"code points added: {len(missing)}")
    print(f"output sha256: {sha256(args.out)}")


if __name__ == "__main__":
    main()
