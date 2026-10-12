// rootBundle asset loads never complete under `flutter test --platform chrome`,
// so the font table checks run on the Dart VM (`flutter test
// test/font_coverage_test.dart`). The theme fallback is covered on Chrome by
// theme_font_fallback_test.dart.
@TestOn('vm')
library;

import 'package:flutter/services.dart';
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

Future<Set<int>> _fontCodePoints(String asset) async =>
    _codePoints(await rootBundle.load(asset));

void main() {
  late Set<int> traditional;
  late Set<int> supplement;

  setUpAll(() async {
    TestWidgetsFlutterBinding.ensureInitialized();
    traditional = await _fontCodePoints('assets/fonts/NotoSansTC-Variable.ttf');
    supplement =
        await _fontCodePoints('assets/fonts/NotoSansSC-Supplement.ttf');
  });

  test('supplement only adds code points missing from Noto Sans TC', () {
    expect(supplement.length, 11856);
    expect(supplement.intersection(traditional), isEmpty);
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
    final covered = traditional.union(supplement);
    final missing = <String>{
      for (final rune in samples.join().runes)
        if (rune > 0x7F && !covered.contains(rune) && rune != 0x3000)
          String.fromCharCode(rune),
    };
    expect(missing, isEmpty);
  });
}
