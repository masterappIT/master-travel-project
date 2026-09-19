import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

import 'app/route_names.dart';
import 'core/api/driver_api_client.dart';
import 'core/layout/driver_page_shell.dart';
import 'core/navigation/driver_navigation.dart';

import 'package:driver_web/core/tokens/driver_tokens.dart';

class OrderAcceptedPage extends StatefulWidget {
  const OrderAcceptedPage({super.key, this.tripId});

  final String? tripId;

  @override
  State<OrderAcceptedPage> createState() => _OrderAcceptedPageState();
}

class _OrderAcceptedPageState extends State<OrderAcceptedPage> {
  final _api = DriverApiClient.instance;
  Map<String, dynamic>? _trip;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadTrip();
  }

  Future<void> _loadTrip() async {
    final tripId = widget.tripId;
    if (tripId == null || tripId.isEmpty) {
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
      final trip = await _api.trip(tripId);
      if (mounted) setState(() => _trip = trip);
    } on DriverApiException catch (error) {
      if (mounted) setState(() => _error = error.message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
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

  Future<void> _cancelTrip() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('取消接單？'),
        content: const Text('取消後訂單會回到接單大廳，乘客訂單及付款不會被取消。'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(false),
            child: const Text('返回'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(dialogContext).pop(true),
            child: const Text('確認取消'),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;

    setState(() => _loading = true);
    try {
      final tripId = widget.tripId;
      if (tripId == null || tripId.isEmpty) throw StateError('missing trip id');
      await _api.cancelTrip(tripId);
      if (mounted) {
        DriverNavigation.replaceAll(context, DriverRouteNames.orders);
      }
    } on StateError {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(const SnackBar(content: Text('找不到可取消的訂單')));
      }
    } on DriverApiException catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(error.message)));
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _advanceTrip() async {
    setState(() => _loading = true);
    try {
      final tripId = widget.tripId;
      if (tripId == null) throw StateError('missing trip id');

      if (_trip?['startedAt'] != null ||
          _trip?['executionPhase'] == 'IN_PROGRESS') {
        if (mounted) {
          DriverNavigation.push(
            context,
            DriverRouteNames.orderInProgress,
            arguments: tripId,
          );
        }
        return;
      }

      if (_trip?['arrivedAt'] == null) {
        await _api.arriveTrip(tripId);
        await _loadTrip();
      } else {
        await _api.startTrip(tripId);
        if (mounted) {
          DriverNavigation.push(
            context,
            DriverRouteNames.orderInProgress,
            arguments: tripId,
          );
        }
      }
    } on StateError {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(const SnackBar(content: Text('找不到可處理的訂單')));
      }
    } on DriverApiException catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(error.message)));
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final origin = _tripText('pickupAddress', '起點待確認');
    final destination = _tripText('dropoffAddress', '終點待確認');
    final driver = _api.currentDriver;

    return DriverPageShell(
      selectedIndex: 1,
      showBottomNavigation: false,
      topPadding: 24,
      horizontalPadding: 24,
      bottomPadding: 24,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              InkWell(
                onTap: () => Navigator.of(context).pop(),
                child: Row(children: [
                  const Text('<',
                      style: TextStyle(fontSize: 20, color: DriverColors.text)),
                  const SizedBox(width: DriverSpacing.sm),
                  const Text('返回接單大廳',
                      style: TextStyle(
                          fontSize: DriverTypography.bodyLarge,
                          fontWeight: FontWeight.w500,
                          color: DriverColors.text)),
                ]),
              ),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                decoration: BoxDecoration(
                    color: DriverColors.successBackground,
                    borderRadius: BorderRadius.circular(DriverRadii.pill)),
                child: const Text('成功接單',
                    style: TextStyle(
                        fontSize: DriverTypography.label,
                        fontWeight: FontWeight.w700,
                        color: DriverColors.success)),
              ),
            ],
          ),
          const SizedBox(height: DriverSpacing.xl),
          if (_loading)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 120),
              child: Center(child: CircularProgressIndicator()),
            )
          else if (_error != null)
            _AcceptedError(message: _error!, onRetry: _loadTrip)
          else ...[
            _AcceptedMapPreview(
              origin: _region(origin, '起點待確認'),
              destination: _region(destination, '終點待確認'),
            ),
            const SizedBox(height: DriverSpacing.xl),
            _AcceptedOrderCard(
              origin: origin,
              destination: destination,
              scheduledAt: _formatDate(_trip?['scheduledAt']),
              passenger: _tripText('passengerName', '乘客'),
              price: _formatPrice(_trip?['price'], _trip?['currency']),
            ),
            const SizedBox(height: DriverSpacing.xl),
            _AcceptedVehicleCard(driver: driver),
            const SizedBox(height: DriverSpacing.xl),
          ],
          if (!_loading && _error == null)
            Row(children: [
              Expanded(
                  child: OutlinedButton(
                      onPressed: _loading ? null : _cancelTrip,
                      style: _cancelStyle(),
                      child: const Text('取消訂單'))),
              const SizedBox(width: DriverSpacing.md),
              Expanded(
                  child: ElevatedButton(
                onPressed: _loading ? null : _advanceTrip,
                style: _arrivedStyle(),
                child: Text(
                  _loading
                      ? '處理中…'
                      : _trip?['arrivedAt'] == null
                          ? '確認到達上車點'
                          : '開始行程',
                ),
              )),
            ]),
        ],
      ),
    );
  }
}

class _AcceptedError extends StatelessWidget {
  const _AcceptedError({required this.message, required this.onRetry});
  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) => Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(message, textAlign: TextAlign.center),
            const SizedBox(height: DriverSpacing.md),
            OutlinedButton(onPressed: onRetry, child: const Text('重新載入')),
          ],
        ),
      );
}

class _AcceptedMapPreview extends StatelessWidget {
  const _AcceptedMapPreview({required this.origin, required this.destination});
  final String origin;
  final String destination;

  @override
  Widget build(BuildContext context) => Container(
        height: 180,
        decoration: BoxDecoration(
            color: DriverColors.text,
            borderRadius: BorderRadius.circular(DriverRadii.card)),
        child: Stack(children: [
          Center(
              child: Column(mainAxisSize: MainAxisSize.min, children: [
            const Text('地圖路徑預覽',
                style: TextStyle(
                    fontSize: DriverTypography.label,
                    color: Color(0xb3ffffff))),
            const SizedBox(height: 12),
            _MapRouteText(origin: origin, destination: destination),
          ])),
          const Positioned(top: 16, left: 16, child: _MapLabel('起點')),
          const Positioned(top: 16, right: 16, child: _MapLabel('終點')),
        ]),
      );
}

class _MapRouteText extends StatelessWidget {
  const _MapRouteText({required this.origin, required this.destination});
  final String origin;
  final String destination;

  @override
  Widget build(BuildContext context) => Column(children: [
        Row(mainAxisSize: MainAxisSize.min, children: [
          SvgPicture.asset('assets/order-detail-origin.svg',
              width: 8, height: 8),
          const SizedBox(width: DriverSpacing.sm),
          Text(origin,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                  fontSize: DriverTypography.bodyLarge,
                  fontWeight: FontWeight.w700,
                  color: DriverColors.surface)),
        ]),
        const SizedBox(height: DriverSpacing.xs),
        const Text('│',
            style: TextStyle(
                fontSize: DriverTypography.caption, color: Color(0xff80a0ff))),
        const SizedBox(height: DriverSpacing.xs),
        Row(mainAxisSize: MainAxisSize.min, children: [
          SvgPicture.asset('assets/order-detail-destination.svg',
              width: 8, height: 8),
          const SizedBox(width: DriverSpacing.sm),
          Text(destination,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                  fontSize: DriverTypography.bodyLarge,
                  fontWeight: FontWeight.w700,
                  color: DriverColors.surface)),
        ]),
      ]);
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

class _AcceptedOrderCard extends StatelessWidget {
  const _AcceptedOrderCard({
    required this.origin,
    required this.destination,
    required this.scheduledAt,
    required this.passenger,
    required this.price,
  });
  final String origin;
  final String destination;
  final String scheduledAt;
  final String passenger;
  final String price;

  @override
  Widget build(BuildContext context) => _Panel(
        padding: 20,
        children: [
          Row(children: [
            Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                    color: DriverColors.successBackground,
                    borderRadius: BorderRadius.circular(18))),
            const SizedBox(width: DriverSpacing.md),
            const Text('接單成功',
                style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                    color: DriverColors.text)),
          ]),
          const Divider(height: 1, color: DriverColors.background),
          _AddressPair(origin: origin, destination: destination),
          _InfoRow(label: '出發時間', value: scheduledAt),
          _InfoRow(label: '乘客', value: passenger),
          _InfoRow(label: '車資', value: price, bold: true),
        ],
      );
}

class _AddressPair extends StatefulWidget {
  const _AddressPair({required this.origin, required this.destination});

  final String origin;
  final String destination;

  @override
  State<_AddressPair> createState() => _AddressPairState();
}

class _AddressPairState extends State<_AddressPair> {
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
              fontSize: DriverTypography.body,
              fontWeight: FontWeight.w500,
              color: DriverColors.text);
          final hasOverflow = _exceedsTwoLines(
                  widget.origin, constraints.maxWidth, valueStyle) ||
              _exceedsTwoLines(
                  widget.destination, constraints.maxWidth, valueStyle);

          return Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              _AddressColumn(
                  label: '出發地', value: widget.origin, expanded: _expanded),
              const SizedBox(height: DriverSpacing.lg),
              _AddressColumn(
                  label: '目的地', value: widget.destination, expanded: _expanded),
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
            ],
          );
        },
      );
}

class _AddressColumn extends StatelessWidget {
  const _AddressColumn(
      {required this.label, required this.value, required this.expanded});

  final String label;
  final String value;
  final bool expanded;

  @override
  Widget build(BuildContext context) => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label,
              style: const TextStyle(
                  fontSize: DriverTypography.body,
                  color: DriverColors.secondaryText)),
          const SizedBox(height: DriverSpacing.xs),
          Text(value,
              maxLines: expanded ? null : 2,
              overflow: expanded ? TextOverflow.visible : TextOverflow.ellipsis,
              style: const TextStyle(
                  fontSize: DriverTypography.body,
                  fontWeight: FontWeight.w500,
                  color: DriverColors.text)),
        ],
      );
}

class _InfoRow extends StatelessWidget {
  const _InfoRow({required this.label, required this.value, this.bold = false});
  final String label;
  final String value;
  final bool bold;
  @override
  Widget build(BuildContext context) =>
      Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        SizedBox(
            width: 96,
            child: Text(label,
                style: const TextStyle(
                    fontSize: DriverTypography.body,
                    color: DriverColors.secondaryText))),
        const SizedBox(width: DriverSpacing.md),
        Expanded(
            child: Text(value,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                    fontSize: DriverTypography.body,
                    fontWeight: bold ? FontWeight.w700 : FontWeight.w500,
                    color: DriverColors.text))),
      ]);
}

class _AcceptedVehicleCard extends StatelessWidget {
  const _AcceptedVehicleCard({required this.driver});
  final Map<String, dynamic>? driver;

  String _text(String key, String fallback) {
    final value = driver?[key]?.toString().trim();
    return value == null || value.isEmpty ? fallback : value;
  }

  String _plate() {
    for (final key in ['hkPlate', 'macauPlate', 'mainlandPlate']) {
      final value = driver?[key]?.toString().trim();
      if (value != null && value.isNotEmpty) return value;
    }
    return '車牌待確認';
  }

  @override
  Widget build(BuildContext context) => _Panel(
        padding: 16,
        children: [
          Row(children: [
            Container(
                width: 36,
                height: 36,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                    color: DriverColors.infoBackground,
                    borderRadius: BorderRadius.circular(18)),
                child: SvgPicture.asset('assets/order-detail-car.svg',
                    width: 20, height: 20)),
            const SizedBox(width: 10),
            Expanded(
                child: Text(_text('vehicleCategory', '已登記車輛'),
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w700,
                        color: DriverColors.text))),
          ]),
          const Divider(height: 1, color: DriverColors.background),
          _VehicleInfoRow(label: '車牌', value: _plate()),
          _VehicleInfoRow(label: '車輛顏色', value: _text('vehicleColor', '顏色待確認')),
        ],
      );
}

class _VehicleInfoRow extends StatelessWidget {
  const _VehicleInfoRow({required this.label, required this.value});
  final String label;
  final String value;
  @override
  Widget build(BuildContext context) =>
      Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
        Text(label,
            style: const TextStyle(
                fontSize: DriverTypography.body,
                color: DriverColors.secondaryText)),
        Text(value,
            style: const TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w700,
                color: DriverColors.text)),
      ]);
}

class _Panel extends StatelessWidget {
  const _Panel({required this.padding, required this.children});
  final double padding;
  final List<Widget> children;
  @override
  Widget build(BuildContext context) => Container(
        padding: EdgeInsets.all(padding),
        decoration: BoxDecoration(
            color: DriverColors.surface,
            border: Border.all(color: DriverColors.divider),
            borderRadius: BorderRadius.circular(DriverRadii.card),
            boxShadow: const [
              BoxShadow(
                  color: Color(0x1238434a), blurRadius: 4, offset: Offset(0, 2))
            ]),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            for (var index = 0; index < children.length; index++)
              Padding(
                padding: EdgeInsets.only(
                    bottom: index == children.length - 1 ? 0 : 16),
                child: children[index],
              ),
          ],
        ),
      );
}

ButtonStyle _cancelStyle() => OutlinedButton.styleFrom(
    minimumSize: const Size.fromHeight(54),
    foregroundColor: const Color(0xff57667d),
    backgroundColor: DriverColors.surface,
    side: const BorderSide(color: DriverColors.border),
    shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(DriverRadii.card)),
    textStyle: const TextStyle(
        fontSize: DriverTypography.bodyLarge, fontWeight: FontWeight.w500));
ButtonStyle _arrivedStyle() => ElevatedButton.styleFrom(
    minimumSize: const Size.fromHeight(54),
    foregroundColor: DriverColors.surface,
    backgroundColor: DriverColors.activeBlue,
    elevation: 0,
    shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(DriverRadii.card)),
    textStyle: const TextStyle(
        fontSize: DriverTypography.bodyLarge, fontWeight: FontWeight.w700));
