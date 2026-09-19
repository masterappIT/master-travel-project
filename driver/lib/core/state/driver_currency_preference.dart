import 'package:flutter/foundation.dart';

import '../platform/browser_storage.dart';

class DriverCurrencyPreference extends ValueNotifier<String> {
  DriverCurrencyPreference._() : super(_readStoredCurrency());

  static const _storageKey = 'driver_currency_preference';
  static final instance = DriverCurrencyPreference._();

  static String _readStoredCurrency() {
    final stored = readBrowserValue(_storageKey);
    return stored == 'CNY' ? 'CNY' : 'HKD';
  }

  @override
  set value(String next) {
    final normalized = next == 'CNY' ? 'CNY' : 'HKD';
    super.value = normalized;
    writeBrowserValue(_storageKey, normalized);
  }

  String get code => value;

  String get name => switch (value) {
        'CNY' => '人民幣',
        _ => '港幣',
      };

  String get symbol => value == 'CNY' ? '¥' : 'HK\$';
}
