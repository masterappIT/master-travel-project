import 'dart:async';
import 'dart:developer' as developer;

import 'package:flutter/material.dart';

import '../api/driver_api_client.dart';
import '../widgets/driver_overlays.dart';
import '../platform/order_event_stream.dart';
import '../state/driver_alert_audio_controller.dart';
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
  ids.addAll(assignedTrips
      .whereType<Map>()
      .where((trip) {
        return trip['driverId'] != null &&
            trip['completedAt'] == null &&
            trip['executionPhase'] == 'DRIVER_PENDING_ACCEPTANCE';
      })
      .map((trip) => trip['id']?.toString())
      .whereType<String>());
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

bool _setEquals(Set<String> left, Set<String> right) =>
    left.length == right.length && left.containsAll(right);

class DriverOrderAlertCoordinator extends StatefulWidget {
  const DriverOrderAlertCoordinator({
    super.key,
    required this.child,
    required this.navigatorKey,
  });

  final Widget child;
  final GlobalKey<NavigatorState> navigatorKey;

  static final ValueNotifier<int> tripsChanged = ValueNotifier<int>(0);
  static final ValueNotifier<int> notificationsChanged = ValueNotifier<int>(0);

  @override
  State<DriverOrderAlertCoordinator> createState() =>
      _DriverOrderAlertCoordinatorState();
}

class _DriverOrderAlertCoordinatorState
    extends State<DriverOrderAlertCoordinator> with WidgetsBindingObserver {
  final _api = DriverApiClient.instance;
  final _alertAudio = DriverAlertAudioController.instance;
  Timer? _refreshTimer;
  Timer? _eventDebounce;
  Timer? _reconnectTimer;
  Timer? _notificationReconnectTimer;
  OrderEventConnection? _eventConnection;
  OrderEventConnection? _notificationConnection;
  Set<String>? _knownIds;
  bool _refreshInFlight = false;
  bool _refreshPending = false;
  bool _active = false;
  bool _cancellationDialogShowing = false;
  final Set<String> _queuedCancellationIds = {};
  final List<Map<String, dynamic>> _cancellationQueue = [];

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
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed && _active) {
      unawaited(_refresh());
      if (_eventConnection == null) {
        unawaited(_connectEvents());
      }
      if (_notificationConnection == null) {
        unawaited(_connectNotificationEvents());
      }
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
    _alertAudio.setSessionActive(true);
    _knownIds = null;
    unawaited(_refresh());
    unawaited(_connectEvents());
    unawaited(_connectNotificationEvents());
    _refreshTimer = Timer.periodic(
      const Duration(seconds: 30),
      (_) => unawaited(_refresh()),
    );
  }

  void _stop() {
    _active = false;
    _alertAudio.setSessionActive(false);
    _knownIds = null;
    _cancellationQueue.clear();
    _queuedCancellationIds.clear();
    _cancellationDialogShowing = false;
    _refreshPending = false;
    _refreshTimer?.cancel();
    _refreshTimer = null;
    _eventDebounce?.cancel();
    _eventDebounce = null;
    _reconnectTimer?.cancel();
    _reconnectTimer = null;
    _notificationReconnectTimer?.cancel();
    _notificationReconnectTimer = null;
    _eventConnection?.close();
    _eventConnection = null;
    _notificationConnection?.close();
    _notificationConnection = null;
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

  Future<void> _connectNotificationEvents() async {
    if (!_active) return;
    _notificationReconnectTimer?.cancel();
    _notificationConnection?.close();
    _notificationConnection = null;
    try {
      final response = await _api.notificationEventTicket();
      if (!mounted || !_active) return;
      final ticket = response['ticket']?.toString();
      if (ticket == null || ticket.isEmpty) {
        _scheduleNotificationReconnect();
        return;
      }
      final url =
          '${_api.baseUrl}/driver/auth/notifications/events?ticket=${Uri.encodeQueryComponent(ticket)}';
      _notificationConnection = connectOrderEvents(
        url,
        () {
          if (_active) {
            DriverOrderAlertCoordinator.notificationsChanged.value++;
            unawaited(_refresh());
          }
        },
        _scheduleNotificationReconnect,
      );
    } on Object catch (error, stackTrace) {
      developer.log('Unable to connect driver notification events',
          name: 'driver.order_alert', error: error, stackTrace: stackTrace);
      _scheduleNotificationReconnect();
    }
  }

  void _scheduleNotificationReconnect() {
    _notificationConnection?.close();
    _notificationConnection = null;
    _notificationReconnectTimer?.cancel();
    if (!_active) return;
    _notificationReconnectTimer = Timer(
      const Duration(seconds: 5),
      () => unawaited(_connectNotificationEvents()),
    );
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
    if (!_active) return;
    if (_refreshInFlight) {
      _refreshPending = true;
      return;
    }
    _refreshInFlight = true;
    try {
      final assignedTrips = await _api.activeTrips();
      final cancellationNotifications =
          await _api.pendingCancellationNotifications();
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
      final changed = _knownIds == null || !_setEquals(_knownIds!, ids);
      _knownIds = ids;
      if (changed) DriverOrderAlertCoordinator.tripsChanged.value++;
      _enqueueCancellationNotifications(cancellationNotifications);
      if (play && !await _alertAudio.playNewOrderAlert()) {
        developer.log(
          'New-order alert sound requires driver activation',
          name: 'driver.order_alert',
        );
      }
    } on DriverApiException catch (error, stackTrace) {
      developer.log('Unable to refresh driver order alerts',
          name: 'driver.order_alert', error: error, stackTrace: stackTrace);
      if (error.statusCode == 401) _api.clearSession();
    } on Object catch (error, stackTrace) {
      developer.log('Unexpected driver order alert failure',
          name: 'driver.order_alert', error: error, stackTrace: stackTrace);
    } finally {
      _refreshInFlight = false;
      if (_refreshPending && _active) {
        _refreshPending = false;
        unawaited(_refresh());
      }
    }
  }

  void _enqueueCancellationNotifications(List<dynamic> notifications) {
    for (final notification in notifications.whereType<Map>()) {
      final item = Map<String, dynamic>.from(notification);
      final id = item['id']?.toString();
      if (id == null || !_queuedCancellationIds.add(id)) continue;
      _cancellationQueue.add(item);
    }
    _showNextCancellationDialog();
  }

  void _showNextCancellationDialog() {
    if (!mounted || _cancellationDialogShowing || _cancellationQueue.isEmpty) {
      return;
    }
    _cancellationDialogShowing = true;
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      if (!mounted || !_active || _cancellationQueue.isEmpty) {
        _cancellationDialogShowing = false;
        return;
      }
      final dialogContext = widget.navigatorKey.currentContext;
      if (dialogContext == null) {
        _cancellationDialogShowing = false;
        WidgetsBinding.instance.addPostFrameCallback(
          (_) => _showNextCancellationDialog(),
        );
        return;
      }
      final item = _cancellationQueue.first;
      final id = item['id'].toString();
      final trip = item['trip'] is Map
          ? Map<String, dynamic>.from(item['trip'] as Map)
          : <String, dynamic>{};
      var acknowledging = false;
      String? errorMessage;
      await showDriverDialog<void>(
        context: dialogContext,
        barrierDismissible: false,
        builder: (dialogContext) => PopScope(
          canPop: false,
          child: StatefulBuilder(
            builder: (context, setDialogState) => DriverDialog(
              title: Text(item['title']?.toString() ?? '行程已取消'),
              content: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                      '訂單編號：${_formatOrderNumber(trip['id'] ?? item['tripId'])}'),
                  const SizedBox(height: 8),
                  Text('出發時間：${_formatCancellationTime(trip['scheduledAt'])}'),
                  const SizedBox(height: 8),
                  Text(
                      '${trip['origin']?.toString() ?? '-'} → ${trip['destination']?.toString() ?? '-'}'),
                  const SizedBox(height: 12),
                  Text(item['content']?.toString() ?? '此行程已取消，請停止前往。'),
                  if (errorMessage != null) ...[
                    const SizedBox(height: 12),
                    Text(errorMessage!,
                        style: const TextStyle(color: Colors.red)),
                  ],
                ],
              ),
              actions: [
                FilledButton(
                  onPressed: acknowledging
                      ? null
                      : () async {
                          setDialogState(() {
                            acknowledging = true;
                            errorMessage = null;
                          });
                          try {
                            await _api.readNotification(id);
                            if (dialogContext.mounted) {
                              Navigator.of(dialogContext).pop();
                            }
                          } on Object {
                            if (dialogContext.mounted) {
                              setDialogState(() {
                                acknowledging = false;
                                errorMessage = '暫時無法確認，請重試。';
                              });
                            }
                          }
                        },
                  child: Text(acknowledging ? '處理中…' : '我知道了'),
                ),
              ],
            ),
          ),
        ),
      );
      _cancellationQueue.removeAt(0);
      _queuedCancellationIds.remove(id);
      _cancellationDialogShowing = false;
      _showNextCancellationDialog();
    });
    WidgetsBinding.instance.ensureVisualUpdate();
  }

  String _formatOrderNumber(dynamic value) {
    final digits = value?.toString().replaceAll(RegExp(r'\D'), '') ?? '';
    if (digits.isEmpty) return '-';
    final suffix =
        digits.length > 8 ? digits.substring(digits.length - 8) : digits;
    return 'A${suffix.padLeft(8, '0')}';
  }

  String _formatCancellationTime(dynamic value) {
    final date = DateTime.tryParse(value?.toString() ?? '')?.toLocal();
    if (date == null) return '-';
    String two(int number) => number.toString().padLeft(2, '0');
    return '${date.year}/${two(date.month)}/${two(date.day)} ${two(date.hour)}:${two(date.minute)}';
  }

  @override
  Widget build(BuildContext context) => widget.child;
}
