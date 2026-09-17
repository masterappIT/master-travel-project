import 'package:flutter/material.dart';

abstract final class DriverNavigation {
  static Future<Object?> push(
    BuildContext context,
    String route, {
    Object? arguments,
  }) {
    return Navigator.of(context).pushNamed<Object?>(
      route,
      arguments: arguments,
    );
  }

  static Future<void> replace(
    BuildContext context,
    String route, {
    Object? arguments,
  }) {
    return Navigator.of(context)
        .pushReplacementNamed(route, arguments: arguments);
  }

  static Future<void> replaceAll(BuildContext context, String route) {
    return Navigator.of(context).pushNamedAndRemoveUntil(route, (_) => false);
  }
}
