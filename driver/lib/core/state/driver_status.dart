import 'package:flutter/foundation.dart';

class DriverStatusController {
  DriverStatusController._();

  static final DriverStatusController instance = DriverStatusController._();

  final ValueNotifier<bool?> isOnline = ValueNotifier<bool?>(null);
}
