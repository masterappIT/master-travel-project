import 'dart:html' as html;

import 'package:flutter/foundation.dart';

class DriverLanguagePreference extends ValueNotifier<String> {
  DriverLanguagePreference._()
      : super(html.window.localStorage[_storageKey] ?? traditionalChinese);

  static final instance = DriverLanguagePreference._();
  static const _storageKey = 'driver_language';
  static const traditionalChinese = '繁體中文';
  static const simplifiedChinese = '简体中文';
  static const english = 'English';
  static const languages = [traditionalChinese, simplifiedChinese, english];

  void select(String language) {
    if (!languages.contains(language) || value == language) return;
    value = language;
    html.window.localStorage[_storageKey] = language;
  }

  String text(String traditional, String simplified, String englishText) {
    if (value == simplifiedChinese) return simplified;
    if (value == english) return englishText;
    return traditional;
  }
}

String driverText(String traditional, String simplified, String english) =>
    DriverLanguagePreference.instance.text(traditional, simplified, english);
