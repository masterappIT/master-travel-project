import 'package:flutter/foundation.dart';

String driverApiBaseUrl({String? configured, Uri? pageUri}) {
  final value =
      configured ?? const String.fromEnvironment('DRIVER_API_BASE_URL');
  final page = pageUri ?? Uri.base;
  if (value.trim() == '/api' && page.host.isNotEmpty) {
    return page.resolve('/api').toString();
  }
  if (value.trim().isNotEmpty) return value;
  if (kIsWeb && page.host.isNotEmpty) return 'http://${page.host}:3010';
  return 'http://127.0.0.1:3010';
}
