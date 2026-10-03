import '../platform/browser_storage.dart';
import '../platform/driver_alert_tone.dart';

class DriverAlertSoundPreference {
  DriverAlertSoundPreference._();

  static final instance = DriverAlertSoundPreference._();
  static const _storageKey = 'driver_new_order_alert_sound';
  static const _toneKey = 'driver_new_order_alert_tone';

  DriverAlertTone get tone =>
      DriverAlertTone.fromId(readBrowserValue(_toneKey));

  void setTone(DriverAlertTone tone) => writeBrowserValue(_toneKey, tone.id);

  bool get enabled => readBrowserValue(_storageKey) != 'false';

  void setEnabled(bool enabled) {
    writeBrowserValue(_storageKey, enabled.toString());
  }
}
