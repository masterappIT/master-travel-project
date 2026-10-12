import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';

import 'driver_font_coverage.g.dart';

/// On-demand CJK font layers (see tool/build_driver_font_layers.py).
///
/// Only the UI layer is in the FontManifest and blocks the first frame. Text
/// that arrives at runtime must pass through [ensureForPayload] or
/// [ensureForText] before it is shown, so characters outside the UI layer
/// never render as missing-glyph boxes.
enum DriverFontLayer {
  common(driverFontCommonRanges),
  rare(driverFontRareRanges);

  const DriverFontLayer(this._encodedRanges);

  final List<int> _encodedRanges;

  /// Families in the theme's fontFamilyFallback, in addition to the UI layer.
  List<String> get families => [
        'Noto Sans TC ${_label()}',
        'Noto Sans SC ${_label()}',
      ];

  List<String> get assets => [
        'assets/fonts/NotoSansTC-${_label()}.ttf',
        'assets/fonts/NotoSansSC-${_label()}.ttf',
      ];

  String _label() => name[0].toUpperCase() + name.substring(1);
}

typedef DriverFontBytesLoader = Future<ByteData> Function(String asset);
typedef DriverFontRegistrar = Future<void> Function(
    String family, Future<ByteData> bytes);

abstract final class DriverFontLayers {
  static DriverFontBytesLoader _loadBytes = rootBundle.load;
  static DriverFontRegistrar _register = _registerFont;
  static final _loads = <String, Future<void>>{};
  static final _starts = <DriverFontLayer, List<int>>{};
  static final _ends = <DriverFontLayer, List<int>>{};

  /// Ensures every string inside a decoded JSON payload can be rendered.
  static Future<void> ensureForPayload(Object? payload) {
    final buffer = StringBuffer();
    _collect(payload, buffer);
    return ensureForText(buffer.toString());
  }

  static Future<void> ensureForText(String text) {
    final needed = <DriverFontLayer>{};
    for (final rune in text.runes) {
      if (rune < 0x100) continue; // Always in the UI layer.
      for (final layer in DriverFontLayer.values) {
        if (!needed.contains(layer) && _covers(layer, rune)) needed.add(layer);
      }
      if (needed.length == DriverFontLayer.values.length) break;
    }
    if (needed.isEmpty) return Future.value();
    return Future.wait(needed.map(load)).then((_) {});
  }

  /// Loads a layer's fonts once each; a font that failed to load is retried
  /// by the next caller.
  static Future<void> load(DriverFontLayer layer) => Future.wait([
        for (var i = 0; i < layer.assets.length; i++)
          _loads[layer.families[i]] ??=
              _register(layer.families[i], _loadBytes(layer.assets[i]))
                  .catchError((Object error, StackTrace stackTrace) {
            _loads.remove(layer.families[i]);
            Error.throwWithStackTrace(error, stackTrace);
          }),
      ]).then((_) {});

  /// True once every layer is loaded, so any typed or pasted text renders.
  static final allLoaded = ValueNotifier<bool>(false);

  static Future<void> loadAll() => Future.wait(DriverFontLayer.values.map(load))
      .then((_) => allLoaded.value = true);

  static bool _covers(DriverFontLayer layer, int rune) {
    final starts = _starts[layer] ?? _decode(layer);
    final ends = _ends[layer]!;
    var low = 0;
    var high = starts.length - 1;
    while (low <= high) {
      final mid = (low + high) >> 1;
      if (rune < starts[mid]) {
        high = mid - 1;
      } else if (rune > ends[mid]) {
        low = mid + 1;
      } else {
        return true;
      }
    }
    return false;
  }

  static List<int> _decode(DriverFontLayer layer) {
    final starts = <int>[];
    final ends = <int>[];
    var position = 0;
    final encoded = layer._encodedRanges;
    for (var i = 0; i < encoded.length; i += 2) {
      final start = position + encoded[i];
      position = start + encoded[i + 1];
      starts.add(start);
      ends.add(position - 1);
    }
    _ends[layer] = ends;
    return _starts[layer] = starts;
  }

  static void _collect(Object? value, StringBuffer buffer) {
    if (value is String) {
      buffer.write(value);
    } else if (value is Map) {
      for (final entry in value.entries) {
        _collect(entry.key, buffer);
        _collect(entry.value, buffer);
      }
    } else if (value is Iterable) {
      for (final item in value) {
        _collect(item, buffer);
      }
    }
  }

  static Future<void> _registerFont(
          String family, Future<ByteData> bytes) =>
      (FontLoader(family)..addFont(bytes)).load();

  static void overrideForTesting({
    DriverFontBytesLoader? loadBytes,
    DriverFontRegistrar? register,
  }) {
    _loads.clear();
    allLoaded.value = false;
    _loadBytes = loadBytes ?? rootBundle.load;
    _register = register ?? _registerFont;
  }
}
