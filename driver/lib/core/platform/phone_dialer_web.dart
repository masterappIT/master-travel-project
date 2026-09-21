// ignore_for_file: avoid_web_libraries_in_flutter, deprecated_member_use

import 'dart:html' as html;

Future<void> openPhoneDialer(String phoneNumber) async {
  final normalized = phoneNumber.replaceAll(RegExp(r'[^\d+]'), '');
  html.window.location.href = Uri(scheme: 'tel', path: normalized).toString();
}
