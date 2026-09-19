// ignore_for_file: avoid_web_libraries_in_flutter, deprecated_member_use

import 'dart:html' as html;

String? readBrowserValue(String key) => html.window.localStorage[key];

void writeBrowserValue(String key, String value) {
  html.window.localStorage[key] = value;
}

void removeBrowserValue(String key) {
  html.window.localStorage.remove(key);
}
