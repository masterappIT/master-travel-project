import 'dart:async';
import 'dart:developer' as developer;

import 'package:flutter/material.dart';

import '../api/driver_api_client.dart';
import '../platform/new_order_alert.dart';
import '../platform/order_event_stream.dart';
import '../state/driver_alert_sound_preference.dart';

Set<String> driverAlertTripIds({
  required Iterable<dynamic> availableTrips,
  required Iterable<dynamic> assignedTrips,
}) {
  final ids = availableTrips
      .whereType<Map>()
      .map((trip) => trip['id']?.toString())
      .whereType<String>()
      .toSet();
  ids.addAll(assignedTrips.whereType<Map>().where((trip) {
    return trip['driverId'] != null &&
        trip['completedAt'] == null &&
        trip['executionPhase'] == 'DRIVER_PENDING_ACCEPTANCE';
  }).map((trip) => trip['id']?.toString()).whereType<String>());
  return ids;
}

bool shouldPlayDriverOrderAlert({
  required Set<String>? previousIds,
  required Set<String> currentIds,
  required bool enabled,
}) =>
    enabled &&
    previousIds != null &&
    currentIds.difference(previousIds).isNotEmpty;

class DriverOrderAlertCoordinator extends StatefulWidget {
  const DriverOrderAlertCoordinator({super.key, required this.child});

  final Widget child;

  static final ValueNotifier<int> tripsChanged = ValueNotifier<int>(0);

  @override
  State<DriverOrderAlertCoordinator> createState() =>
      _DriverOrderAlertCoordinatorState();
}

class _DriverOrderAlertCoordinatorState
    extends State<DriverOrderAlertCoordinator> with WidgetsBindingObserver {
  final _api = DriverApiClient.instance;
  late final NewOrderAlert _alert = NewOrderAlert();
  Timer? _refreshTimer;
  Timer? _eventDebounce;
  Timer? _reconnectTimer;
  OrderEventConnection? _eventConnection;
  Set<String>? _knownIds;
  bool _refreshInFlight = false;
  bool _active = false;
  bool _soundPromptShown = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _api.sessionRevision.addListener(_syncSession);
    _syncSession();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _api.sessionRevision.removeListener(_syncSession);
    _stop();
    _alert.dispose();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed && _active) {
      unawaited(_refresh());
      if (_eventConnection == null) unawaited(_connectEvents());
    }
  }

  void _syncSession() {
    final shouldRun = _api.token != null && _api.isApproved;
    if (shouldRun == _active) return;
    if (shouldRun) {
      _start();
    } else {
      _stop();
    }
  }

  void _start() {
    _active = true;
    _knownIds = null;
    unawaited(_refresh());
    unawaited(_connectEvents());
    _refreshTimer = Timer.periodic(
      const Duration(seconds: 30),
      (_) => unawaited(_refresh()),
    );
  }

  void _stop() {
    _active = false;
    _knownIds = null;
    _refreshTimer?.cancel();
    _refreshTimer = null;
    _eventDebounce?.cancel();
    _eventDebounce = null;
    _reconnectTimer?.cancel();
    _reconnectTimer = null;
    _eventConnection?.close();
    _eventConnection = null;
  }

  Future<void> _connectEvents() async {
    if (!_active) return;
    _reconnectTimer?.cancel();
    _eventConnection?.close();
    _eventConnection = null;
    try {
      final response = await _api.orderEventTicket();
      if (!mounted || !_active) return;
      final ticket = response['ticket']?.toString();
      if (ticket == null || ticket.isEmpty) {
        _scheduleReconnect();
        return;
      }
      final url =
          '${_api.baseUrl}/driver/auth/trips/events?ticket=${Uri.encodeQueryComponent(ticket)}';
      _eventConnection = connectOrderEvents(url, () {
        _eventDebounce?.cancel();
        _eventDebounce = Timer(const Duration(milliseconds: 300), () {
          if (_active) unawaited(_refresh());
        });
      }, _scheduleReconnect);
    } on Object catch (error, stackTrace) {
      developer.log('Unable to connect driver order events',
          name: 'driver.order_alert', error: error, stackTrace: stackTrace);
      _scheduleReconnect();
    }
  }

  void _scheduleReconnect() {
    _eventConnection?.close();
    _eventConnection = null;
    _reconnectTimer?.cancel();
    if (!_active) return;
    _reconnectTimer = Timer(
      const Duration(seconds: 5),
      () => unawaited(_connectEvents()),
    );
  }

  Future<void> _refresh() async {
    if (!_active || _refreshInFlight) return;
    _refreshInFlight = true;
    try {
      final assignedTrips = await _api.trips();
      List<dynamic> availableTrips;
      try {
        availableTrips = await _api.availableTrips();
      } on DriverApiException catch (error) {
        if (error.statusCode != 403) rethrow;
        availableTrips = [];
      }
      if (!_active) return;
      final ids = driverAlertTripIds(
        availableTrips: availableTrips,
        assignedTrips: assignedTrips,
      );
      final play = shouldPlayDriverOrderAlert(
        previousIds: _knownIds,
        currentIds: ids,
        enabled: DriverAlertSoundPreference.instance.enabled,
      );
      _knownIds = ids;
      DriverOrderAlertCoordinator.tripsChanged.value++;
      if (play && !await _alert.play()) _showSoundPrompt();
    } on DriverApiException catch (error, stackTrace) {
      developer.log('Unable to refresh driver order alerts',
          name: 'driver.order_alert', error: error, stackTrace: stackTrace);
      if (error.statusCode == 401) _api.clearSession();
    } on Object catch (error, stackTrace) {
      developer.log('Unexpected driver order alert failure',
          name: 'driver.order_alert', error: error, stackTrace: stackTrace);
    } finally {
      _refreshInFlight = false;
    }
  }

  void _showSoundPrompt() {
    if (!mounted || _soundPromptShown) return;
    _soundPromptShown = true;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      final messenger = ScaffoldMessenger.maybeOf(context);
      messenger
          ?.showSnackBar(SnackBar(
            content: const Text('點擊啟用新訂單提示聲'),
            action: SnackBarAction(
              label: '啟用',
              onPressed: () async {
                if (await _alert.unlock()) _soundPromptShown = false;
              },
            ),
          ))
          .closed
          .then((_) => _soundPromptShown = false);
    });
  }

  @override
  Widget build(BuildContext context) => widget.child;
}
