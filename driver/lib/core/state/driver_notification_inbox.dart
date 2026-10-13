import 'package:flutter/foundation.dart';

import '../api/driver_api_client.dart';

/// Shared read of the driver's notification list, so the bell badge, the
/// notification sheet and the new-notification notice use one request.
abstract final class DriverNotificationInbox {
  static final ValueNotifier<int> unreadCount = ValueNotifier<int>(0);
  static Future<List<dynamic>>? _inFlight;
  static int _session = 0;

  static Future<List<dynamic>> load() => _inFlight ??= _track(_fetch());

  static Future<List<dynamic>> _track(Future<List<dynamic>> request) {
    late final Future<List<dynamic>> tracked;
    tracked = request.whenComplete(() {
      if (identical(_inFlight, tracked)) _inFlight = null;
    });
    return tracked;
  }

  /// Updates [unreadCount] and ignores failures; the badge keeps its last value.
  static Future<void> refresh() async {
    try {
      await load();
    } on Object catch (_) {}
  }

  /// Clears the count on sign-out; a request still in flight for the previous
  /// account must not write its result back.
  static void reset() {
    _session++;
    _inFlight = null;
    unreadCount.value = 0;
  }

  static Future<List<dynamic>> _fetch() async {
    final session = _session;
    final items = await DriverApiClient.instance.notifications();
    if (session == _session) {
      unreadCount.value =
          items.whereType<Map>().where((item) => item['readAt'] == null).length;
    }
    return items;
  }
}
