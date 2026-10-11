import 'package:flutter/foundation.dart';

import '../api/driver_api_client.dart';
import 'driver_currency_preference.dart';

class DriverCurrencyInitialization {
  DriverCurrencyInitialization._();

  static Future<void>? _defaultLoad;
  static bool _finished = false;

  static bool get isReady =>
      DriverCurrencyPreference.hasStoredPreference || _finished;

  static Future<void> ensureReady() {
    if (isReady) {
      return Future<void>.value();
    }
    return _defaultLoad ??= _loadDefault();
  }

  static Future<void> _loadDefault() async {
    try {
      final settings = await DriverApiClient.instance
          .settings()
          .timeout(const Duration(seconds: 8));
      DriverCurrencyPreference.setDefaultIfUnset(
          settings['driverDefaultCurrency']?.toString());
    } on Object {
      // Use the existing local fallback for this application session.
    } finally {
      _finished = true;
    }
  }

  @visibleForTesting
  static void resetForTesting() {
    _defaultLoad = null;
    _finished = false;
  }
}
