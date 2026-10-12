import 'dart:async';
import 'dart:typed_data';

import 'package:driver_web/core/fonts/driver_font_layers.dart';
import 'package:flutter_test/flutter_test.dart';

/// Asset loads never complete under `flutter test --platform chrome`, so the
/// on-demand font layers resolve immediately in tests unless a test
/// overrides them. They are reset before every test because a cached load
/// future created in a previous test's fake-async zone would never complete.
Future<void> testExecutable(FutureOr<void> Function() testMain) async {
  setUp(() => DriverFontLayers.overrideForTesting(
        loadBytes: (_) async => ByteData(0),
        register: (_, __) async {},
      ));
  await testMain();
}
