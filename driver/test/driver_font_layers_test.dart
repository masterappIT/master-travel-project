import 'dart:async';
import 'dart:typed_data';

import 'package:driver_web/core/fonts/driver_font_layers.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  late List<String> loaded;
  late List<String> registered;
  Completer<void>? gate;
  var failNext = false;

  setUp(() {
    loaded = [];
    registered = [];
    gate = null;
    failNext = false;
    DriverFontLayers.overrideForTesting(
      loadBytes: (asset) async {
        loaded.add(asset);
        await gate?.future;
        if (failNext) {
          failNext = false;
          throw StateError('network');
        }
        return ByteData(0);
      },
      register: (family, bytes) async {
        await bytes;
        registered.add(family);
      },
    );
  });

  test('UI text needs no deferred layer', () async {
    await DriverFontLayers.ensureForText('接單大廳 Order 123 · 登入／註冊');
    expect(loaded, isEmpty);
  });

  test('payload text loads only the layers it needs, once', () async {
    gate = Completer<void>();
    final first = DriverFontLayers.ensureForPayload({
      'origin': {'address': '广州白云国际机场'},
      'items': ['佛山市禅城区'],
    });
    final second = DriverFontLayers.ensureForText('深圳湾口岸');
    gate!.complete();
    await Future.wait([first, second]);
    expect(loaded, DriverFontLayer.common.assets);
    expect(registered, DriverFontLayer.common.families);
    expect(DriverFontLayers.allLoaded.value, isFalse);
  });

  test('rare characters load the rare layer before returning', () async {
    await DriverFontLayers.ensureForText('㷛');
    expect(loaded, DriverFontLayer.rare.assets);
  });

  test('a failed load is retried by the next caller', () async {
    failNext = true;
    await expectLater(
        DriverFontLayers.ensureForText('广州'), throwsA(isA<StateError>()));
    await DriverFontLayers.ensureForText('广州');
    expect(registered, unorderedEquals(DriverFontLayer.common.families));
  });

  test('loadAll marks every layer loaded', () async {
    await DriverFontLayers.loadAll();
    expect(DriverFontLayers.allLoaded.value, isTrue);
    expect(loaded.toSet(), {
      ...DriverFontLayer.common.assets,
      ...DriverFontLayer.rare.assets,
    });
  });
}
