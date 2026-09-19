import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

import 'app/route_names.dart';
import 'core/api/driver_api_client.dart';
import 'core/layout/driver_page_shell.dart';
import 'core/navigation/driver_navigation.dart';

import 'package:driver_web/core/tokens/driver_tokens.dart';

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

  @override
  void initState() {
    super.initState();
    _loadTrip();
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
        DriverNavigation.push(
          context,
          DriverRouteNames.orderAccepted,
          arguments: widget.tripId,
        );
      }
    } on DriverApiException catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(error.message)));
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
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(error.message)));
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

  @override
  Widget build(BuildContext context) {
    final origin = _tripText('pickupAddress', '起點待確認');
    final destination = _tripText('dropoffAddress', '終點待確認');
    final originRegion = _region(origin, '起點待確認');
    final destinationRegion = _region(destination, '終點待確認');
    final passenger = _tripText('passengerName', '乘客');
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

    return DriverPageShell(
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
                constraints: const BoxConstraints(minWidth: 44, minHeight: 44),
                icon: const Text('<',
                    style: TextStyle(fontSize: 18, color: DriverColors.text)),
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
            _MapPreview(origin: originRegion, destination: destinationRegion),
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
                  type: _vehicles[index]['vehicleCategory']
                              ?.toString()
                              .trim()
                              .isNotEmpty ==
                          true
                      ? _vehicles[index]['vehicleCategory'].toString()
                      : missingVehicleText,
                  plate: _vehiclePlate(_vehicles[index], missingVehicleText),
                  selected:
                      _vehicles[index]['id']?.toString() == _selectedVehicleId,
                  onTap: () => setState(() =>
                      _selectedVehicleId = _vehicles[index]['id']?.toString()),
                ),
                if (index < _vehicles.length - 1)
                  const SizedBox(height: DriverSpacing.md),
              ]
            else
              _VehicleCard(
                index: 0,
                title: vehicle?['vehicleColor']?.toString().trim().isNotEmpty ==
                        true
                    ? vehicle!['vehicleColor'].toString()
                    : missingVehicleText,
                type:
                    vehicle?['vehicleCategory']?.toString().trim().isNotEmpty ==
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

class _OrderDetailError extends StatelessWidget {
  const _OrderDetailError({required this.message, required this.onRetry});
  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 80),
        child: Column(children: [
          Text(message,
              textAlign: TextAlign.center,
              style: const TextStyle(color: DriverColors.secondaryText)),
          const SizedBox(height: DriverSpacing.md),
          OutlinedButton(onPressed: onRetry, child: const Text('重新載入')),
        ]),
      );
}

class _MapPreview extends StatelessWidget {
  const _MapPreview({required this.origin, required this.destination});
  final String origin;
  final String destination;

  @override
  Widget build(BuildContext context) => Container(
        height: 180,
        decoration: BoxDecoration(
            color: DriverColors.text,
            borderRadius: BorderRadius.circular(DriverRadii.card),
            boxShadow: const [
              BoxShadow(
                  color: Color(0x1f38434a),
                  blurRadius: 24,
                  offset: Offset(0, 8))
            ]),
        child: Stack(children: [
          Center(
              child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 56),
            child: Column(mainAxisSize: MainAxisSize.min, children: [
              const Text('地圖路徑預覽',
                  style: TextStyle(
                      fontSize: DriverTypography.label,
                      color: Color(0xb3ffffff))),
              const SizedBox(height: 8),
              Text('$origin → $destination',
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                      fontSize: DriverTypography.bodyLarge,
                      fontWeight: FontWeight.w700,
                      color: DriverColors.surface))
            ]),
          )),
          Positioned(top: 16, left: 16, child: _MapLabel('起點')),
          Positioned(top: 16, right: 16, child: _MapLabel('終點')),
        ]),
      );
}

class _MapLabel extends StatelessWidget {
  const _MapLabel(this.label);
  final String label;
  @override
  Widget build(BuildContext context) => Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
          color: const Color(0x1affffff),
          borderRadius: BorderRadius.circular(DriverRadii.pill)),
      child: Text(label,
          style: const TextStyle(
              fontSize: DriverTypography.caption,
              color: DriverColors.surface)));
}

class _OrderInfoCard extends StatefulWidget {
  const _OrderInfoCard({
    required this.passenger,
    required this.routeOrigin,
    required this.routeDestination,
    required this.origin,
    required this.destination,
    required this.scheduledAt,
    required this.price,
  });
  final String passenger;
  final String routeOrigin;
  final String routeDestination;
  final String origin;
  final String destination;
  final String scheduledAt;
  final String price;

  @override
  State<_OrderInfoCard> createState() => _OrderInfoCardState();
}

class _OrderInfoCardState extends State<_OrderInfoCard> {
  bool _expanded = false;

  bool _exceedsTwoLines(String value, double width, TextStyle style) {
    final painter = TextPainter(
      text: TextSpan(text: value, style: style),
      maxLines: 2,
      textDirection: TextDirection.ltr,
    )..layout(maxWidth: width);
    return painter.didExceedMaxLines;
  }

  @override
  Widget build(BuildContext context) => LayoutBuilder(
        builder: (context, constraints) {
          const valueStyle = TextStyle(
              fontSize: DriverTypography.body, color: DriverColors.text);
          final hasOverflow = _exceedsTwoLines(
                  widget.origin, constraints.maxWidth, valueStyle) ||
              _exceedsTwoLines(
                  widget.destination, constraints.maxWidth, valueStyle);

          return Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
                color: DriverColors.surface,
                border: Border.all(color: DriverColors.divider),
                borderRadius: BorderRadius.circular(DriverRadii.card),
                boxShadow: const [
                  BoxShadow(
                      color: Color(0x1238434a),
                      blurRadius: 4,
                      offset: Offset(0, 2))
                ]),
            child:
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: 56,
                    height: 56,
                    decoration: BoxDecoration(
                        color: DriverColors.background,
                        borderRadius: BorderRadius.circular(DriverRadii.input)),
                  ),
                  const SizedBox(width: DriverSpacing.md),
                  Expanded(
                    child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(widget.passenger,
                              style: const TextStyle(
                                  fontSize: DriverTypography.bodyLarge,
                                  fontWeight: FontWeight.w700,
                                  color: DriverColors.text)),
                          const SizedBox(height: 4),
                          Text(
                              '${widget.routeOrigin} → ${widget.routeDestination}',
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                  fontSize: DriverTypography.label,
                                  color: Color(0xff57667d))),
                          const SizedBox(height: 4),
                          Text(widget.scheduledAt,
                              style: const TextStyle(
                                  fontSize: DriverTypography.label,
                                  color: DriverColors.secondaryText))
                        ]),
                  ),
                ],
              ),
              const SizedBox(height: DriverSpacing.md),
              _AddressRow(
                asset: 'assets/order-detail-origin.svg',
                label: widget.origin,
                expanded: _expanded,
              ),
              const SizedBox(height: DriverSpacing.md),
              _AddressRow(
                asset: 'assets/order-detail-destination.svg',
                label: widget.destination,
                expanded: _expanded,
              ),
              if (hasOverflow) ...[
                const SizedBox(height: DriverSpacing.sm),
                Align(
                  alignment: Alignment.centerLeft,
                  child: TextButton(
                    onPressed: () => setState(() => _expanded = !_expanded),
                    child: Text(_expanded ? '收起地址' : '查看完整地址'),
                  ),
                ),
              ],
              const SizedBox(height: DriverSpacing.md),
              Row(crossAxisAlignment: CrossAxisAlignment.center, children: [
                Expanded(
                    child: Text('出發時間  ${widget.scheduledAt}',
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                            fontSize: DriverTypography.label,
                            color: DriverColors.secondaryText))),
                const SizedBox(width: 12),
                Text(widget.price,
                    style: const TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.w700,
                        color: DriverColors.success))
              ]),
            ]),
          );
        },
      );
}

class _AddressRow extends StatelessWidget {
  const _AddressRow({
    required this.asset,
    required this.label,
    required this.expanded,
  });
  final String asset;
  final String label;
  final bool expanded;
  @override
  Widget build(BuildContext context) => Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.only(top: 7),
            child: SvgPicture.asset(asset, width: 8, height: 8),
          ),
          const SizedBox(width: DriverSpacing.sm),
          Expanded(
            child: Text(
              label,
              maxLines: expanded ? null : 2,
              overflow: expanded ? TextOverflow.visible : TextOverflow.ellipsis,
              style: const TextStyle(
                fontSize: DriverTypography.body,
                color: DriverColors.text,
              ),
            ),
          ),
        ],
      );
}

class _VehicleCard extends StatelessWidget {
  const _VehicleCard(
      {required this.index,
      required this.title,
      required this.type,
      required this.plate,
      required this.selected,
      required this.onTap});
  final int index;
  final String title;
  final String type;
  final String plate;
  final bool selected;
  final VoidCallback onTap;
  @override
  Widget build(BuildContext context) => Semantics(
        button: true,
        selected: selected,
        label: '$title $plate',
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(DriverRadii.card),
          child: Container(
            height: 116,
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
                color: DriverColors.surface,
                border: Border.all(
                    color: selected
                        ? DriverColors.activeBlue
                        : DriverColors.divider,
                    width: selected ? 2 : 1),
                borderRadius: BorderRadius.circular(DriverRadii.card)),
            child: Stack(children: [
              Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Container(
                    width: 32,
                    height: 32,
                    decoration: BoxDecoration(
                        color: selected
                            ? DriverColors.infoBackground
                            : DriverColors.background,
                        borderRadius: BorderRadius.circular(DriverRadii.card)),
                    alignment: Alignment.center,
                    child: SvgPicture.asset(
                        index == 0
                            ? 'assets/order-detail-car.svg'
                            : 'assets/order-detail-car-mpv.svg',
                        width: 18,
                        height: 18)),
                const SizedBox(width: 10),
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(title,
                      style: const TextStyle(
                          fontSize: DriverTypography.body,
                          fontWeight: FontWeight.w700,
                          color: DriverColors.text)),
                  const SizedBox(height: 2),
                  Text(type,
                      style: const TextStyle(
                          fontSize: DriverTypography.caption,
                          color: DriverColors.secondaryText))
                ])
              ]),
              Positioned(
                  left: 0,
                  bottom: 0,
                  child: Text(plate,
                      style: const TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w700,
                          color: DriverColors.text))),
              Positioned(
                  right: 0,
                  bottom: 0,
                  child: Container(
                      width: 20,
                      height: 20,
                      decoration: BoxDecoration(
                          color: selected
                              ? DriverColors.primary
                              : DriverColors.surface,
                          border: selected
                              ? null
                              : Border.all(color: DriverColors.border),
                          borderRadius: BorderRadius.circular(10)),
                      alignment: Alignment.center,
                      child: selected
                          ? SvgPicture.asset('assets/order-detail-check.svg',
                              width: 12, height: 12)
                          : null)),
            ]),
          ),
        ),
      );
}
