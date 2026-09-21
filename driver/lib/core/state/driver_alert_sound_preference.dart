import '../platform/browser_storage.dart';

class DriverAlertSoundPreference {
  DriverAlertSoundPreference._();

  static final instance = DriverAlertSoundPreference._();
  static const _storageKey = 'driver_new_order_alert_sound';

  bool get enabled => readBrowserValue(_storageKey) != 'false';

  void setEnabled(bool enabled) {
    writeBrowserValue(_storageKey, enabled.toString());
  }
}
