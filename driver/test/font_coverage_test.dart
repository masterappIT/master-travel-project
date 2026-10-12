// Font files are read with dart:io, so these checks run on the Dart VM
// (scripts/check-driver-tests.mjs runs them as part of `npm run verify:driver`).
@TestOn('vm')
library;

import 'dart:io';
import 'dart:typed_data';

import 'package:driver_web/core/fonts/driver_font_coverage.g.dart';
import 'package:flutter_test/flutter_test.dart';

/// Reads the Unicode code points mapped by a TrueType font's cmap table
/// (formats 4 and 12, which cover every subtable used by the Noto fonts).
Set<int> _codePoints(ByteData font) {
  final tableCount = font.getUint16(4);
  int? cmapOffset;
  for (var i = 0; i < tableCount; i++) {
    final record = 12 + i * 16;
    final tag = String.fromCharCodes([
      for (var j = 0; j < 4; j++) font.getUint8(record + j),
    ]);
    if (tag == 'cmap') cmapOffset = font.getUint32(record + 8);
  }
  if (cmapOffset == null) throw StateError('cmap table missing');

  final result = <int>{};
  final subtableCount = font.getUint16(cmapOffset + 2);
  for (var i = 0; i < subtableCount; i++) {
    final record = cmapOffset + 4 + i * 8;
    final platform = font.getUint16(record);
    if (platform != 0 && platform != 3) continue;
    final subtable = cmapOffset + font.getUint32(record + 4);
    final format = font.getUint16(subtable);
    if (format == 12) {
      final groups = font.getUint32(subtable + 12);
      for (var g = 0; g < groups; g++) {
        final group = subtable + 16 + g * 12;
        final start = font.getUint32(group);
        final end = font.getUint32(group + 4);
        final glyph = font.getUint32(group + 8);
        for (var cp = start; cp <= end; cp++) {
          if (glyph + cp - start != 0) result.add(cp);
        }
      }
    } else if (format == 4) {
      final segments = font.getUint16(subtable + 6) ~/ 2;
      final ends = subtable + 14;
      final starts = ends + segments * 2 + 2;
      final deltas = starts + segments * 2;
      final rangeOffsets = deltas + segments * 2;
      for (var s = 0; s < segments; s++) {
        final end = font.getUint16(ends + s * 2);
        final start = font.getUint16(starts + s * 2);
        final delta = font.getInt16(deltas + s * 2);
        final rangeOffset = font.getUint16(rangeOffsets + s * 2);
        for (var cp = start; cp <= end && cp != 0xFFFF; cp++) {
          int glyph;
          if (rangeOffset == 0) {
            glyph = (cp + delta) & 0xFFFF;
          } else {
            final address =
                rangeOffsets + s * 2 + rangeOffset + (cp - start) * 2;
            glyph = font.getUint16(address);
            if (glyph != 0) glyph = (glyph + delta) & 0xFFFF;
          }
          if (glyph != 0) result.add(cp);
        }
      }
    }
  }
  return result;
}

Set<int> _fontCodePoints(String path) =>
    _codePoints(ByteData.sublistView(File(path).readAsBytesSync()));

Set<int> _decodedRanges(List<int> encoded) {
  final result = <int>{};
  var position = 0;
  for (var i = 0; i < encoded.length; i += 2) {
    final start = position + encoded[i];
    position = start + encoded[i + 1];
    for (var cp = start; cp < position; cp++) {
      result.add(cp);
    }
  }
  return result;
}

const _layers = ['UI', 'Common', 'Rare'];

void main() {
  final layers = <String, Set<int>>{
    for (final script in ['TC', 'SC'])
      for (final layer in _layers)
        '$script-$layer':
            _fontCodePoints('assets/fonts/NotoSans$script-$layer.ttf'),
  };
  Set<int> layer(String name) =>
      layers['TC-$name']!.union(layers['SC-$name']!);

  test('layers split the source fonts without overlap or loss', () {
    final traditional = _fontCodePoints('assets/fonts/NotoSansTC-Variable.ttf');
    final supplement = _fontCodePoints('assets/fonts/NotoSansSC-Supplement.ttf');
    expect(supplement.intersection(traditional), isEmpty);
    final names = layers.keys.toList();
    for (var i = 0; i < names.length; i++) {
      for (var j = i + 1; j < names.length; j++) {
        expect(layers[names[i]]!.intersection(layers[names[j]]!), isEmpty,
            reason: '${names[i]} / ${names[j]}');
      }
    }
    final all = layers.values.expand((points) => points).toSet();
    expect(all, traditional.union(supplement));
  });

  test('generated coverage table matches the deferred layer fonts', () {
    expect(_decodedRanges(driverFontCommonRanges), layer('Common'));
    expect(_decodedRanges(driverFontRareRanges), layer('Rare'));
  });

  test('UI layer covers every character in the app source', () {
    final covered = layers.values.expand((points) => points).toSet();
    final missing = <String>{};
    for (final file in Directory('lib').listSync(recursive: true)) {
      if (file is! File ||
          !file.path.endsWith('.dart') ||
          file.path.endsWith('.g.dart')) {
        continue;
      }
      for (final rune in file.readAsStringSync().runes) {
        if (rune >= 0x2E80 &&
            covered.contains(rune) &&
            !layer('UI').contains(rune)) {
          missing.add('${String.fromCharCode(rune)} (${file.path})');
        }
      }
    }
    expect(missing, isEmpty,
        reason: 'Run `python3 tool/build_driver_font_layers.py` from driver/');
  });

  test('Simplified Chinese used by the app and mainland data is covered', () {
    const samples = [
      // Simplified UI strings that Noto Sans TC does not cover.
      '击单厅应开录态抢数时暂检测浏状现简线终结览订认记许证试语请败账资辆进钮频',
      // Typical mainland addresses, names and notices.
      '深圳市南山区深圳湾口岸 广州白云机场 专车 为您 乐 书 买 们 区',
      // Common Traditional text keeps rendering from Noto Sans TC.
      '香港 · 中西區美利大廈 接單大廳 等待出發',
    ];
    final covered = layers.values.expand((points) => points).toSet();
    final missing = <String>{
      for (final rune in samples.join().runes)
        if (rune > 0x7F && !covered.contains(rune) && rune != 0x3000)
          String.fromCharCode(rune),
    };
    expect(missing, isEmpty);
    // Mainland place names in data are in the common layer, not the rare one.
    for (final rune in '深圳湾广州白云机场佛山禅城区'.runes) {
      expect(layer('Rare').contains(rune), isFalse,
          reason: String.fromCharCode(rune));
    }
  });
}
