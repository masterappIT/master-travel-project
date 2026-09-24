import 'dart:async';

import 'package:flutter/material.dart';
import 'core/widgets/driver_overlays.dart';
import 'package:flutter_svg/flutter_svg.dart';

import 'app/route_names.dart';
import 'core/api/driver_api_client.dart';
import 'core/formatters/passenger_name.dart';
import 'core/layout/driver_page_shell.dart';
import 'core/navigation/driver_navigation.dart';
import 'core/state/driver_language_preference.dart';

import 'package:driver_web/core/tokens/driver_tokens.dart';

part 'order_detail_sections.dart';

class OrderDetailPage extends StatefulWidget {
  const OrderDetailPage({super.key, this.tripId, this.completed = false});
  final String? tripId;
  final bool completed;

  @override
  State<OrderDetailPage> createState() => _OrderDetailPageState();
}

class _OrderDetailPageState extends State<OrderDetailPage> {
  final _api = DriverApiClient.instance;
  Map<String, dynamic>? _trip;
  List<Map<String, dynamic>> _vehicles = const [];
  String? _selectedVehicleId;
  bool _loading = true;
  bool _accepting = false;
  String? _error;
  String? _centerNotice;
  Timer? _centerNoticeTimer;

  @override
  void initState() {
    super.initState();
    _loadTrip();
  }

  @override
  void dispose() {
    _centerNoticeTimer?.cancel();
    super.dispose();
  }

  void _showCenterNotice(String message) {
    _centerNoticeTimer?.cancel();
    setState(() => _centerNotice = message);
    _centerNoticeTimer = Timer(const Duration(seconds: 3), () {
      if (mounted) setState(() => _centerNotice = null);
    });
  }

  Future<void> _loadTrip() async {
    final id = widget.tripId;
    if (id == null || id.isEmpty) {
      setState(() {
        _error = '找不到訂單編號';
        _loading = false;
      });
      return;
    }
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final trip = await _api.trip(id);
      var vehicles = <Map<String, dynamic>>[];
      if (trip['acceptedAt'] == null &&
          trip['executionPhase'] != 'DRIVER_PENDING_ACCEPTANCE') {
        final result = await _api.listDriverVehicles();
        final data = result['data'];
        if (data is List) {
          vehicles = data
              .whereType<Map>()
              .map((item) => Map<String, dynamic>.from(item))
              .toList();
        }
      }
      if (mounted) {
        setState(() {
          _trip = trip;
          _vehicles = vehicles;
          _selectedVehicleId = vehicles.isEmpty
              ? null
              : vehicles
                  .firstWhere((item) => item['isPrimary'] == true,
                      orElse: () => vehicles.first)['id']
                  ?.toString();
        });
      }
    } on DriverApiException catch (error) {
      if (mounted) setState(() => _error = error.message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _acceptTrip() async {
    if (widget.tripId == null) return;
    setState(() => _accepting = true);
    try {
      await _api.acceptTrip(widget.tripId!,
          vehicleId: _trip?['executionPhase'] == 'DRIVER_PENDING_ACCEPTANCE'
              ? null
              : _selectedVehicleId);
      if (mounted) {
        await DriverNavigation.replace(
          context,
          DriverRouteNames.orderAccepted,
          arguments: widget.tripId,
        );
      }
    } on DriverApiException {
      if (mounted) {
        _showCenterNotice(driverText('搶單失敗', '抢单失败', 'Failed to accept order'));
      }
    } finally {
      if (mounted) setState(() => _accepting = false);
    }
  }

  Future<void> _rejectTrip() async {
    if (widget.tripId == null) return;
    setState(() => _accepting = true);
    try {
      await _api.rejectTrip(widget.tripId!);
      if (mounted) {
        DriverNavigation.replaceAll(context, DriverRouteNames.orders);
      }
    } on DriverApiException catch (error) {
      if (mounted) {
        showDriverNotice(context, error.message);
      }
    } finally {
      if (mounted) setState(() => _accepting = false);
    }
  }

  void _openAcceptedTrip() {
    DriverNavigation.push(
      context,
      DriverRouteNames.orderAccepted,
      arguments: widget.tripId,
    );
  }

  void _openInProgressTrip() {
    DriverNavigation.push(
      context,
      DriverRouteNames.orderInProgress,
      arguments: widget.tripId,
    );
  }

  String _tripText(String key, String fallback) {
    final value = _trip?[key]?.toString().trim();
    return value == null || value.isEmpty ? fallback : value;
  }

  String _formatDate(dynamic value) {
    final date = DateTime.tryParse(value?.toString() ?? '')?.toLocal();
    if (date == null) return '時間待確認';
    String two(int number) => number.toString().padLeft(2, '0');
    return '${date.year}/${two(date.month)}/${two(date.day)} '
        '${two(date.hour)}:${two(date.minute)}';
  }

  String _formatPrice(dynamic value, dynamic currency) {
    if (value is! num) return '待確認';
    final code = currency?.toString();
    final symbol = code == 'HKD'
        ? 'HK\$'
        : code == 'RMB' || code == 'CNY'
            ? '¥'
            : code == null || code.isEmpty
                ? ''
                : '$code ';
    return '$symbol${value.toStringAsFixed(2)}';
  }

  String _region(String address, String fallback) {
    final value = address.split(RegExp(r'[·•]')).first.trim();
    return value.isEmpty ? fallback : value;
  }

  String _vehiclePlate(Map<String, dynamic>? vehicle, String fallback) {
    for (final key in [
      'vehiclePlate',
      'hkPlate',
      'macauPlate',
      'mainlandPlate'
    ]) {
      final value = vehicle?[key]?.toString().trim();
      if (value != null && value.isNotEmpty) return value;
    }
    return fallback;
  }

  String _vehicleOwnershipAndPlateType(
      Map<String, dynamic>? vehicle, String fallback) {
    final ownership = vehicle?['vehicleOwnership']?.toString().trim();
    final plateType = (vehicle?['plateType'] ?? vehicle?['vehiclePlateType'])
        ?.toString()
        .trim();
    final values = [ownership, plateType]
        .whereType<String>()
        .where((value) => value.isNotEmpty)
        .toList();
    return values.isEmpty ? fallback : values.join('·');
  }

  @override
  Widget build(BuildContext context) {
    final origin = _tripText('pickupAddress', '起點待確認');
    final destination = _tripText('dropoffAddress', '終點待確認');
    final originRegion = _region(origin, '起點待確認');
    final destinationRegion = _region(destination, '終點待確認');
    final passenger = formatPassengerName(_trip);
    final scheduledAt = _formatDate(_trip?['scheduledAt']);
    final accepted = _trip?['acceptedAt'] != null;
    final pendingAssignment =
        _trip?['executionPhase'] == 'DRIVER_PENDING_ACCEPTANCE' && !accepted;
    final currentVehicle = _vehicles.cast<Map<String, dynamic>?>().firstWhere(
        (item) => item?['id']?.toString() == _selectedVehicleId,
        orElse: () => null);
    final vehicle = selectTripVehicle(
      accepted: accepted || pendingAssignment,
      completed: widget.completed,
      snapshot: _trip?['vehicle'],
      currentVehicle: currentVehicle,
    );
    final missingVehicleText = accepted || pendingAssignment || widget.completed
        ? '歷史資料未記錄'
        : '車輛資料待確認';
    final inProgress = _trip?['executionPhase'] == 'IN_PROGRESS';

    return Stack(
      alignment: Alignment.center,
      children: [
        DriverPageShell(
          selectedIndex: 1,
          showBottomNavigation: false,
          topPadding: 24,
          horizontalPadding: 24,
          bottomPadding: 32,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(children: [
                Semantics(
                  button: true,
                  label: '返回接單大廳',
                  child: IconButton(
                    onPressed: () => Navigator.of(context).pop(),
                    padding: EdgeInsets.zero,
                    constraints:
                        const BoxConstraints(minWidth: 44, minHeight: 44),
                    icon: const Text('<',
                        style:
                            TextStyle(fontSize: 18, color: DriverColors.text)),
                  ),
                ),
                const SizedBox(width: DriverSpacing.sm),
                Text(widget.completed ? '已完成訂單詳情' : '訂單詳情',
                    style: const TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.w700,
                        color: DriverColors.text)),
              ]),
              const SizedBox(height: DriverSpacing.sm),
              Text(widget.completed ? '行程與結算資料' : '請確認乘客資訊與行程內容',
                  style: const TextStyle(
                      fontSize: DriverTypography.body,
                      color: DriverColors.secondaryText)),
              const SizedBox(height: DriverSpacing.xl),
              if (_loading)
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 120),
                  child: Center(child: CircularProgressIndicator()),
                )
              else if (_error != null)
                _OrderDetailError(message: _error!, onRetry: _loadTrip)
              else ...[
                _MapPreview(
                    origin: originRegion, destination: destinationRegion),
                const SizedBox(height: DriverSpacing.xl),
                _OrderInfoCard(
                  passenger: passenger,
                  routeOrigin: originRegion,
                  routeDestination: destinationRegion,
                  origin: origin,
                  destination: destination,
                  scheduledAt: scheduledAt,
                  price: _formatPrice(_trip?['price'], _trip?['currency']),
                ),
                const SizedBox(height: DriverSpacing.xl),
                const Text('接單車輛',
                    style: TextStyle(
                        fontSize: DriverTypography.body,
                        fontWeight: FontWeight.w700,
                        color: DriverColors.text)),
                const SizedBox(height: DriverSpacing.md),
                if (!accepted && !pendingAssignment)
                  for (var index = 0; index < _vehicles.length; index++) ...[
                    _VehicleCard(
                      index: index,
                      title: _vehicles[index]['vehicleColor']
                                  ?.toString()
                                  .trim()
                                  .isNotEmpty ==
                              true
                          ? _vehicles[index]['vehicleColor'].toString()
                          : missingVehicleText,
                      ownership: _vehicleOwnershipAndPlateType(
                          _vehicles[index], missingVehicleText),
                      type: _vehicles[index]['vehicleCategory']
                                  ?.toString()
                                  .trim()
                                  .isNotEmpty ==
                              true
                          ? _vehicles[index]['vehicleCategory'].toString()
                          : missingVehicleText,
                      plate:
                          _vehiclePlate(_vehicles[index], missingVehicleText),
                      selected: _vehicles[index]['id']?.toString() ==
                          _selectedVehicleId,
                      onTap: () => setState(() => _selectedVehicleId =
                          _vehicles[index]['id']?.toString()),
                    ),
                    if (index < _vehicles.length - 1)
                      const SizedBox(height: DriverSpacing.md),
                  ]
                else
                  _VehicleCard(
                    index: 0,
                    title: vehicle?['vehicleColor']
                                ?.toString()
                                .trim()
                                .isNotEmpty ==
                            true
                        ? vehicle!['vehicleColor'].toString()
                        : missingVehicleText,
                    ownership: _vehicleOwnershipAndPlateType(
                        vehicle, missingVehicleText),
                    type: vehicle?['vehicleCategory']
                                ?.toString()
                                .trim()
                                .isNotEmpty ==
                            true
                        ? vehicle!['vehicleCategory'].toString()
                        : missingVehicleText,
                    plate: _vehiclePlate(vehicle, missingVehicleText),
                    selected: true,
                    onTap: () {},
                  ),
                if (!widget.completed) ...[
                  const SizedBox(height: DriverSpacing.xl),
                  if (!accepted)
                    Row(children: [
                      Expanded(
                          child: OutlinedButton(
                              onPressed: _accepting
                                  ? null
                                  : pendingAssignment
                                      ? _rejectTrip
                                      : () => Navigator.of(context).pop(),
                              style: _secondaryButtonStyle(),
                              child: Text(pendingAssignment ? '不接此單' : '拒絕'))),
                      const SizedBox(width: DriverSpacing.md),
                      Expanded(
                          child: ElevatedButton(
                              onPressed: _accepting ||
                                      (!pendingAssignment &&
                                          _selectedVehicleId == null)
                                  ? null
                                  : _acceptTrip,
                              style: _primaryButtonStyle(),
                              child: Text(_accepting ? '處理中…' : '確認接單'))),
                    ])
                  else
                    ElevatedButton(
                      onPressed:
                          inProgress ? _openInProgressTrip : _openAcceptedTrip,
                      style: _primaryButtonStyle(),
                      child: Text(inProgress ? '查看進行中行程' : '查看已接行程'),
                    ),
                ],
              ],
            ],
          ),
        ),
        if (_centerNotice != null)
          Positioned.fill(
            child: IgnorePointer(
              child: Center(
                child: Semantics(
                  liveRegion: true,
                  label: _centerNotice,
                  child: Container(
                    width: double.infinity,
                    constraints: const BoxConstraints(
                      maxWidth: DriverDimensions.maxContentWidth,
                    ),
                    margin: const EdgeInsets.all(DriverSpacing.xl),
                    padding: const EdgeInsets.symmetric(
                      horizontal: DriverSpacing.xl,
                      vertical: DriverSpacing.xl,
                    ),
                    decoration: BoxDecoration(
                      color: DriverColors.surface,
                      borderRadius: BorderRadius.circular(DriverRadii.card),
                      border: Border.all(color: DriverColors.border),
                      boxShadow: DriverShadows.floating,
                    ),
                    child: Text(
                      _centerNotice!,
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        color: DriverColors.text,
                        fontSize: DriverTypography.body,
                        fontWeight: FontWeight.w700,
                        decoration: TextDecoration.none,
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
      ],
    );
  }
}

ButtonStyle _secondaryButtonStyle() => OutlinedButton.styleFrom(
      minimumSize: const Size.fromHeight(56),
      foregroundColor: DriverColors.text,
      backgroundColor: DriverColors.surface,
      side: const BorderSide(color: DriverColors.divider),
      shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(DriverRadii.card)),
      textStyle: const TextStyle(
          fontSize: DriverTypography.bodyLarge, fontWeight: FontWeight.w700),
    );

ButtonStyle _primaryButtonStyle() => ElevatedButton.styleFrom(
      minimumSize: const Size.fromHeight(56),
      foregroundColor: DriverColors.surface,
      backgroundColor: DriverColors.activeBlue,
      elevation: 0,
      shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(DriverRadii.card)),
      textStyle: const TextStyle(
          fontSize: DriverTypography.bodyLarge, fontWeight: FontWeight.w700),
    );
