import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'app/route_names.dart';
import 'core/api/driver_api_client.dart';
import 'core/layout/driver_page_shell.dart';
import 'core/navigation/driver_navigation.dart';
import 'core/platform/new_order_alert.dart';
import 'core/platform/order_event_stream.dart';
import 'core/state/driver_alert_sound_preference.dart';
import 'core/state/driver_language_preference.dart';
import 'core/state/driver_status.dart';

import 'package:driver_web/core/tokens/driver_tokens.dart';

bool shouldPlayNewOrderAlert({
  required Set<String>? previousIds,
  required Set<String> currentIds,
  required bool enabled,
}) =>
    enabled &&
    previousIds != null &&
    currentIds.difference(previousIds).isNotEmpty;

class OrderHallPage extends StatefulWidget {
  const OrderHallPage({super.key, this.newOrderAlert});

  final NewOrderAlert? newOrderAlert;

  @override
  State<OrderHallPage> createState() => _OrderHallPageState();
}

class _OrderHallPageState extends State<OrderHallPage>
    with WidgetsBindingObserver {
  final _api = DriverApiClient.instance;
  late final NewOrderAlert _newOrderAlert =
      widget.newOrderAlert ?? NewOrderAlert();
  Timer? _refreshTimer;
  Timer? _eventDebounce;
  Timer? _reconnectTimer;
  OrderEventConnection? _eventConnection;
  bool _refreshInFlight = false;
  int _selectedTab = 0;
  bool _loading = true;
  String? _error;
  Set<String>? _knownAvailableIds;
  List<dynamic> _available = [];
  List<dynamic> _accepted = [];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _loadTrips();
    _connectEvents();
    _refreshTimer = Timer.periodic(
      const Duration(seconds: 30),
      (_) => _loadTrips(background: true),
    );
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _refreshTimer?.cancel();
    _eventDebounce?.cancel();
    _reconnectTimer?.cancel();
    _eventConnection?.close();
    _newOrderAlert.dispose();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      _loadTrips(background: true);
      if (_eventConnection == null) _connectEvents();
    }
  }

  Future<void> _connectEvents() async {
    _reconnectTimer?.cancel();
    _eventConnection?.close();
    _eventConnection = null;
    try {
      final response = await _api.orderEventTicket();
      if (!mounted) return;
      final ticket = response['ticket']?.toString();
      if (ticket == null || ticket.isEmpty) return;
      final url =
          '${_api.baseUrl}/driver/auth/trips/events?ticket=${Uri.encodeQueryComponent(ticket)}';
      _eventConnection = connectOrderEvents(url, () {
        _eventDebounce?.cancel();
        _eventDebounce = Timer(
          const Duration(milliseconds: 300),
          () => _loadTrips(background: true),
        );
      }, _scheduleReconnect);
    } on Object {
      _scheduleReconnect();
    }
  }

  void _scheduleReconnect() {
    _eventConnection?.close();
    _eventConnection = null;
    _reconnectTimer?.cancel();
    if (!mounted) return;
    _reconnectTimer = Timer(const Duration(seconds: 5), _connectEvents);
  }

  Future<void> _loadTrips({bool background = false}) async {
    if (_refreshInFlight) return;
    _refreshInFlight = true;
    try {
      final acceptedTrips = await _api.trips();
      List<dynamic> availableTrips;
      try {
        availableTrips = await _api.availableTrips();
      } on DriverApiException catch (error) {
        if (error.statusCode != 403) rethrow;
        availableTrips = [];
      }
      if (!mounted) return;
      final assignedTrips = acceptedTrips
          .where((trip) =>
              trip is Map &&
              trip['driverId'] != null &&
              trip['completedAt'] == null)
          .toList();
      final pendingTrips = assignedTrips
          .where(
              (trip) => trip['executionPhase'] == 'DRIVER_PENDING_ACCEPTANCE')
          .toList();
      final availableIds = availableTrips
          .whereType<Map>()
          .map((trip) => trip['id']?.toString())
          .whereType<String>()
          .toSet();
      final shouldPlayAlert = shouldPlayNewOrderAlert(
        previousIds: _knownAvailableIds,
        currentIds: availableIds,
        enabled: DriverAlertSoundPreference.instance.enabled,
      );
      _knownAvailableIds = availableIds;
      setState(() {
        _available = [
          ...availableTrips,
          ...pendingTrips.where((trip) =>
              !availableIds.contains((trip as Map)['id']?.toString())),
        ];
        _accepted = assignedTrips
            .where((trip) =>
                trip['executionPhase'] != 'DRIVER_PENDING_ACCEPTANCE' &&
                trip['acceptedAt'] != null)
            .toList();
        _error = null;
        _loading = false;
      });
      if (shouldPlayAlert) unawaited(_newOrderAlert.play());
    } on DriverApiException catch (error) {
      if (mounted && !background) {
        setState(() {
          _error = error.message;
          _loading = false;
        });
      }
    } finally {
      _refreshInFlight = false;
    }
  }

  String _formatPrice(dynamic price, dynamic currency) {
    if (price is! num) return driverText('待確認', '待确认', 'Pending');
    final code = currency?.toString();
    final symbol = code == 'HKD'
        ? 'HK\$'
        : code == 'RMB' || code == 'CNY'
            ? '¥'
            : code == null || code.isEmpty
                ? ''
                : '$code ';
    return '$symbol${price.toStringAsFixed(2)}';
  }

  void _openOrderDetail(String id) {
    DriverNavigation.push(context, DriverRouteNames.orderDetail, arguments: id)
        .then((_) => _loadTrips());
  }

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<bool?>(
        valueListenable: DriverStatusController.instance.isOnline,
        builder: (context, onlineOverride, _) {
          final online = onlineOverride ?? true;
          return DriverPageShell(
            selectedIndex: 1,
            bottomPadding: DriverDimensions.bottomNavigationPadding,
            navHorizontalPadding: DriverDimensions.navHorizontalPadding,
            onHomeTap: () =>
                DriverNavigation.replace(context, DriverRouteNames.home),
            onProfileTap: () =>
                DriverNavigation.replace(context, DriverRouteNames.profile),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Container(
                  padding: const EdgeInsets.all(18),
                  decoration: BoxDecoration(
                    color: DriverColors.surface,
                    borderRadius: BorderRadius.circular(DriverRadii.card),
                    border: Border.all(color: DriverColors.divider),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(driverText('接單大廳', '接单大厅', 'Order hall'),
                              style: TextStyle(
                                  fontSize: 24,
                                  fontWeight: FontWeight.w800,
                                  color: DriverColors.text)),
                          SizedBox(height: DriverSpacing.xs),
                          Text(
                              driverText('掌握可接行程與目前工作', '掌握可接行程与目前工作',
                                  'Available and active trips'),
                              style: TextStyle(
                                  fontSize: DriverTypography.label,
                                  color: DriverColors.secondaryText)),
                        ],
                      ),
                      _OnlineBadge(isOnline: online),
                    ],
                  ),
                ),
                const SizedBox(height: DriverSpacing.lg),
                Container(
                  padding: const EdgeInsets.all(DriverSpacing.xs),
                  decoration: BoxDecoration(
                    color: DriverColors.panelTint,
                    borderRadius: BorderRadius.circular(DriverRadii.input),
                  ),
                  child: _OrderTabs(
                      selectedIndex: _selectedTab,
                      onChanged: (index) =>
                          setState(() => _selectedTab = index)),
                ),
                const SizedBox(height: DriverSpacing.lg),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                        _selectedTab == 0
                            ? driverText('可接行程', '可接行程', 'Available trips')
                            : driverText('進行中行程', '进行中行程', 'Active trips'),
                        style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w700,
                            color: DriverColors.text)),
                    Text(
                        '${_selectedTab == 0 ? _available.length : _accepted.length} ${driverText('筆', '笔', 'trips')}',
                        style: const TextStyle(
                            fontSize: DriverTypography.label,
                            color: DriverColors.secondaryText)),
                  ],
                ),
                const SizedBox(height: DriverSpacing.md),
                if (_loading)
                  const Center(
                    child: Padding(
                      padding: EdgeInsets.symmetric(vertical: DriverSpacing.xl),
                      child: CircularProgressIndicator(),
                    ),
                  )
                else if (_error != null)
                  Center(
                      child: Padding(
                    padding: EdgeInsets.symmetric(vertical: DriverSpacing.xl),
                    child: Text(_error!),
                  ))
                else if (_selectedTab == 0)
                  ..._available.map((trip) {
                    final item = Map<String, dynamic>.from(trip as Map);
                    final pendingAssignment =
                        item['executionPhase'] == 'DRIVER_PENDING_ACCEPTANCE';
                    return Padding(
                      padding: const EdgeInsets.only(bottom: DriverSpacing.md),
                      child: _OrderCard(
                        passenger: item['passengerName']?.toString() ??
                            item['user']?['name']?.toString() ??
                            driverText('乘客', '乘客', 'Passenger'),
                        time: _formatTripTime(item['scheduledAt']),
                        price: _formatPrice(item['price'], item['currency']),
                        origin: item['pickupAddress']?.toString() ??
                            item['origin']?.toString() ??
                            driverText('起點待確認', '起点待确认', 'Pickup pending'),
                        destination: item['dropoffAddress']?.toString() ??
                            item['destination']?.toString() ??
                            driverText('終點待確認', '终点待确认', 'Destination pending'),
                        estimatedTime: pendingAssignment
                            ? driverText(
                                '等待確認接單', '等待确认接单', 'Awaiting confirmation')
                            : driverText('預估行程', '预估行程', 'Estimated trip'),
                        actionLabel: pendingAssignment
                            ? driverText('確認訂單', '确认订单', 'Confirm')
                            : driverText('接單', '接单', 'Accept'),
                        onTap: () => _openOrderDetail(item['id'].toString()),
                      ),
                    );
                  })
                else if (_accepted.isEmpty)
                  const _EmptyAcceptedOrders()
                else
                  ..._accepted.map((trip) {
                    final item = Map<String, dynamic>.from(trip as Map);
                    return Padding(
                      padding: const EdgeInsets.only(bottom: DriverSpacing.md),
                      child: _OrderCard(
                        passenger: item['user']?['name']?.toString() ??
                            item['passengerName']?.toString() ??
                            driverText('乘客', '乘客', 'Passenger'),
                        time: _formatTripTime(item['scheduledAt']),
                        price: _formatPrice(item['price'], item['currency']),
                        origin: item['pickupAddress']?.toString() ??
                            driverText('起點待確認', '起点待确认', 'Pickup pending'),
                        destination: item['dropoffAddress']?.toString() ??
                            driverText('終點待確認', '终点待确认', 'Destination pending'),
                        estimatedTime: driverText('已成功接單', '已成功接单', 'Accepted'),
                        actionLabel: driverText('查看行程', '查看行程', 'View trip'),
                        onTap: () => _openOrderDetail(item['id'].toString()),
                      ),
                    );
                  }),
              ],
            ),
          );
        });
  }
}

String _formatTripTime(dynamic value) {
  if (value == null) return driverText('時間待確認', '时间待确认', 'Time pending');
  final date = DateTime.tryParse(value.toString())?.toLocal();
  if (date == null) return value.toString();
  return '${date.year}/${date.month.toString().padLeft(2, '0')}/${date.day.toString().padLeft(2, '0')} ${date.hour.toString().padLeft(2, '0')}:${date.minute.toString().padLeft(2, '0')}';
}

class _OnlineBadge extends StatelessWidget {
  const _OnlineBadge({required this.isOnline});

  final bool isOnline;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(
            horizontal: DriverSpacing.md, vertical: DriverSpacing.xs),
        decoration: BoxDecoration(
            color: isOnline
                ? DriverColors.activeBlue
                : DriverColors.warningBackground,
            borderRadius: BorderRadius.circular(DriverRadii.pill)),
        child: Text(
            isOnline
                ? driverText('線上接單中', '线上接单中', 'Online')
                : driverText('目前離線', '目前离线', 'Offline'),
            style: TextStyle(
                fontSize: DriverTypography.caption,
                fontWeight: FontWeight.w700,
                color: isOnline
                    ? DriverColors.onPrimary
                    : DriverColors.warningText)),
      );
}

class _OrderTabs extends StatelessWidget {
  const _OrderTabs({required this.selectedIndex, required this.onChanged});
  final int selectedIndex;
  final ValueChanged<int> onChanged;

  @override
  Widget build(BuildContext context) => Wrap(
        spacing: 12,
        children: [
          _OrderTab(
              label: driverText('可接單', '可接单', 'Available'),
              selected: selectedIndex == 0,
              onTap: () => onChanged(0)),
          _OrderTab(
              label: driverText('成功接單', '成功接单', 'Accepted'),
              selected: selectedIndex == 1,
              onTap: () => onChanged(1)),
        ],
      );
}

class _OrderTab extends StatelessWidget {
  const _OrderTab(
      {required this.label, required this.selected, required this.onTap});
  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Semantics(
        button: true,
        selected: selected,
        label: label,
        child: Material(
          color: Colors.transparent,
          child: InkWell(
            borderRadius: BorderRadius.circular(DriverRadii.input),
            onTap: onTap,
            child: Container(
              padding: const EdgeInsets.symmetric(
                  horizontal: DriverSpacing.lg, vertical: 14),
              decoration: BoxDecoration(
                color: selected
                    ? DriverColors.infoBackground
                    : DriverColors.surface,
                border: Border.all(
                    color:
                        selected ? DriverColors.primary : DriverColors.divider),
                borderRadius: BorderRadius.circular(DriverRadii.input),
              ),
              child: Text(label,
                  style: TextStyle(
                      fontSize: DriverTypography.body,
                      fontWeight: selected ? FontWeight.w700 : FontWeight.w400,
                      color: selected
                          ? DriverColors.primary
                          : DriverColors.secondaryText)),
            ),
          ),
        ),
      );
}

class _OrderCard extends StatelessWidget {
  const _OrderCard(
      {required this.passenger,
      required this.time,
      required this.price,
      required this.origin,
      required this.destination,
      required this.estimatedTime,
      required this.actionLabel,
      required this.onTap});
  final String passenger;
  final String time;
  final String price;
  final String origin;
  final String destination;
  final String estimatedTime;
  final String actionLabel;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(DriverRadii.card),
        child: Container(
          padding: const EdgeInsets.symmetric(
              horizontal: DriverSpacing.lg, vertical: DriverSpacing.lg),
          decoration: BoxDecoration(
            color: DriverColors.surface,
            border: Border.all(color: DriverColors.divider),
            borderRadius: BorderRadius.circular(DriverRadii.card),
            boxShadow: DriverShadows.card,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Flexible(
                    child: Text('出發  $time',
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                            fontSize: DriverTypography.body,
                            fontWeight: FontWeight.w500,
                            color: DriverColors.text)),
                  ),
                  const SizedBox(width: DriverSpacing.md),
                  Text(price,
                      style: const TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.w700,
                          color: DriverColors.success)),
                ],
              ),
              const SizedBox(height: DriverSpacing.md),
              Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  _RouteRow(asset: 'assets/route-origin.svg', label: origin),
                  const SizedBox(height: 2),
                  _RouteRow(
                      asset: 'assets/route-destination.svg',
                      label: destination),
                ],
              ),
              const SizedBox(height: DriverSpacing.md),
              const Divider(height: 1, color: DriverColors.divider),
              const SizedBox(height: DriverSpacing.md),
              Row(
                children: [
                  SvgPicture.asset('assets/route-driver.svg',
                      width: 8, height: 8),
                  const SizedBox(width: DriverSpacing.sm),
                  Expanded(
                    child: Text(passenger,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                            fontSize: DriverTypography.body,
                            color: DriverColors.secondaryText)),
                  ),
                ],
              ),
              const SizedBox(height: DriverSpacing.md),
              SizedBox(
                height: 48,
                child: ElevatedButton(
                  onPressed: onTap,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: DriverColors.activeBlue,
                    foregroundColor: DriverColors.surface,
                    elevation: 0,
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(DriverRadii.card)),
                    padding: const EdgeInsets.symmetric(
                        horizontal: DriverSpacing.lg,
                        vertical: DriverSpacing.md),
                  ),
                  child: Text(actionLabel,
                      style: const TextStyle(
                          fontSize: DriverTypography.body,
                          fontWeight: FontWeight.w700)),
                ),
              ),
            ],
          ),
        ),
      );
}

class _RouteRow extends StatelessWidget {
  const _RouteRow({required this.asset, required this.label});
  final String asset;
  final String label;

  @override
  Widget build(BuildContext context) => Row(children: [
        SvgPicture.asset(asset, width: 8, height: 8),
        const SizedBox(width: DriverSpacing.sm),
        Expanded(
            child: Text(label,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                    fontSize: DriverTypography.body,
                    fontWeight: FontWeight.w500,
                    color: DriverColors.text))),
      ]);
}

class _EmptyAcceptedOrders extends StatelessWidget {
  const _EmptyAcceptedOrders();

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(DriverSpacing.xl),
        decoration: BoxDecoration(
            color: DriverColors.surface,
            border: Border.all(color: DriverColors.divider),
            borderRadius: BorderRadius.circular(DriverRadii.card)),
        child: Text(driverText('暫無成功接單', '暂无成功接单', 'No accepted trips'),
            textAlign: TextAlign.center,
            style: TextStyle(
                fontSize: DriverTypography.body,
                color: DriverColors.secondaryText)),
      );
}
