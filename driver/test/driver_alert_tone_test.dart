import 'dart:typed_data';

import 'package:flutter_test/flutter_test.dart';
import 'package:driver_web/core/platform/browser_storage.dart';
import 'package:driver_web/core/platform/driver_alert_tone.dart';
import 'package:driver_web/core/state/driver_alert_sound_preference.dart';

void main() {
  test('tone preference persists locally and falls back for unknown values',
      () {
    final preference = DriverAlertSoundPreference.instance;
    final original = readBrowserValue('driver_new_order_alert_tone');
    addTearDown(() {
      if (original == null) {
        removeBrowserValue('driver_new_order_alert_tone');
      } else {
        writeBrowserValue('driver_new_order_alert_tone', original);
      }
    });
    removeBrowserValue('driver_new_order_alert_tone');
    expect(preference.tone, DriverAlertTone.classic);
    for (final tone in DriverAlertTone.values) {
      preference.setTone(tone);
      expect(readBrowserValue('driver_new_order_alert_tone'), tone.id);
      expect(preference.tone, tone);
    }
    writeBrowserValue('driver_new_order_alert_tone', 'unknown');
    expect(preference.tone, DriverAlertTone.classic);
  });

  test('tones preserve their duration and bounded PCM gain', () {
    final outputs = <String>{};
    for (final tone in DriverAlertTone.values) {
      final bytes = createDriverAlertWav(tone);
      final wav = ByteData.sublistView(bytes);
      expect(wav.getUint32(0, Endian.big), 0x52494646);
      expect(wav.getUint32(8, Endian.big), 0x57415645);
      expect(wav.getUint32(24, Endian.little), 22050);
      expect(wav.getUint32(40, Endian.little) / (22050 * 2),
          closeTo(tone.duration, 1 / 22050));
      var peak = 0;
      for (var offset = 44; offset < bytes.length; offset += 2) {
        final sample = wav.getInt16(offset, Endian.little).abs();
        if (sample > peak) peak = sample;
      }
      expect(peak / 32767, closeTo(tone.gain, 0.001));
      expect(wav.getInt16(44, Endian.little), 0);
      outputs.add(driverAlertToneDataUri(tone));
    }
    expect(outputs.length, DriverAlertTone.values.length);
  });
}
