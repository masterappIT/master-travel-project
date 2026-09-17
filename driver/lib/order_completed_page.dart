import 'package:flutter/material.dart';
import 'app/route_names.dart';
import 'core/api/driver_api_client.dart';
import 'core/layout/driver_page_shell.dart';
import 'core/navigation/driver_navigation.dart';

import 'package:driver_web/core/tokens/driver_tokens.dart';

class OrderCompletedPage extends StatefulWidget {
  const OrderCompletedPage({super.key, this.tripId});

  final String? tripId;

  @override
  State<OrderCompletedPage> createState() => _OrderCompletedPageState();
}

class _OrderCompletedPageState extends State<OrderCompletedPage> {
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
        _error = '找不到已完成的訂單';
        _loading = false;
      });
      return;
    }

    try {
      final trip = await _api.trip(tripId);
      if (mounted) setState(() => _trip = trip);
    } on DriverApiException catch (error) {
      if (mounted) setState(() => _error = error.message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  String _text(String key, String fallback) {
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

  @override
  Widget build(BuildContext context) {
    final origin = _text('pickupAddress', '起點待確認');
    final destination = _text('dropoffAddress', '終點待確認');
    final total = _formatPrice(_trip?['price'], _trip?['currency']);

    return DriverPageShell(
      selectedIndex: 1,
      showBottomNavigation: false,
      topPadding: 24,
      horizontalPadding: 24,
      bottomPadding: 24,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const _CompletionHeader(),
          const SizedBox(height: DriverSpacing.xl),
          if (_loading)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 120),
              child: Center(child: CircularProgressIndicator()),
            )
          else if (_error != null)
            Center(
              child: Column(
                children: [
                  Text(_error!, textAlign: TextAlign.center),
                  const SizedBox(height: DriverSpacing.md),
                  OutlinedButton(
                    onPressed: _loadTrip,
                    child: const Text('重新載入'),
                  ),
                ],
              ),
            )
          else ...[
            _CompletedMapPreview(
              origin: _region(origin, '起點待確認'),
              destination: _region(destination, '終點待確認'),
            ),
            const SizedBox(height: DriverSpacing.xl),
            _OrderDetailsCard(
              origin: origin,
              destination: destination,
              scheduledAt: _formatDate(_trip?['scheduledAt']),
              passenger: _text('passengerName', '乘客'),
            ),
            const SizedBox(height: DriverSpacing.xl),
            _FareBreakdownCard(total: total),
            const SizedBox(height: DriverSpacing.xl),
            ElevatedButton(
              onPressed: () {
                DriverNavigation.replaceAll(context, DriverRouteNames.orders);
              },
              style: _completeStyle(),
              child: const Text('確認完成'),
            ),
          ],
        ],
      ),
    );
  }
}

class _CompletionHeader extends StatelessWidget {
  const _CompletionHeader();

  @override
  Widget build(BuildContext context) => const Column(
        children: [
          _CheckBadge(),
          SizedBox(height: 12),
          Text('行程已抵達目的地',
              style: TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.w700,
                  color: DriverColors.text)),
          SizedBox(height: 12),
          Text('請與乘客確認車資並完成收款',
              style: TextStyle(
                  fontSize: DriverTypography.body,
                  color: DriverColors.secondaryText)),
        ],
      );
}

class _CheckBadge extends StatelessWidget {
  const _CheckBadge();

  @override
  Widget build(BuildContext context) => Container(
        width: 80,
        height: 80,
        alignment: Alignment.center,
        decoration: const BoxDecoration(
          color: DriverColors.primary,
          shape: BoxShape.circle,
        ),
        child: const Icon(
          Icons.check_rounded,
          size: 42,
          color: DriverColors.onPrimary,
        ),
      );
}

class _CompletedMapPreview extends StatelessWidget {
  const _CompletedMapPreview({
    required this.origin,
    required this.destination,
  });

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
              child: Column(mainAxisSize: MainAxisSize.min, children: [
            const Text('城市天際線預覽',
                style: TextStyle(
                    fontSize: DriverTypography.label,
                    color: Color(0xb3ffffff))),
            const SizedBox(height: 8),
            _CompletedRouteText(origin: origin, destination: destination),
          ])),
          const Positioned(top: 16, left: 16, child: _MapLabel('起點')),
          const Positioned(top: 16, right: 16, child: _MapLabel('終點')),
        ]),
      );
}

class _CompletedRouteText extends StatelessWidget {
  const _CompletedRouteText({required this.origin, required this.destination});

  final String origin;
  final String destination;

  @override
  Widget build(BuildContext context) => Column(children: [
        Row(mainAxisSize: MainAxisSize.min, children: [
          const Icon(Icons.radio_button_checked_rounded,
              size: 8, color: DriverColors.primary),
          const SizedBox(width: DriverSpacing.sm),
          Text(origin,
              style: const TextStyle(
                  fontSize: DriverTypography.bodyLarge,
                  fontWeight: FontWeight.w700,
                  color: DriverColors.surface)),
        ]),
        const SizedBox(height: 2),
        const Text('│',
            style: TextStyle(
                fontSize: DriverTypography.caption, color: Color(0xff80a0ff))),
        const SizedBox(height: 2),
        Row(mainAxisSize: MainAxisSize.min, children: [
          const Icon(Icons.location_on_rounded,
              size: 8, color: DriverColors.primary),
          const SizedBox(width: DriverSpacing.sm),
          Text(destination,
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

class _OrderDetailsCard extends StatelessWidget {
  const _OrderDetailsCard({
    required this.origin,
    required this.destination,
    required this.scheduledAt,
    required this.passenger,
  });

  final String origin;
  final String destination;
  final String scheduledAt;
  final String passenger;

  @override
  Widget build(BuildContext context) => _Panel(
        padding: 16,
        children: [
          const Text('訂單詳情',
              style: TextStyle(
                  fontSize: DriverTypography.body,
                  fontWeight: FontWeight.w500,
                  color: DriverColors.text)),
          _InfoRow(label: '出發地', value: origin),
          _InfoRow(label: '目的地', value: destination),
          _InfoRow(label: '出發時間', value: scheduledAt),
          _InfoRow(label: '乘客', value: passenger),
        ],
      );
}

class _FareBreakdownCard extends StatelessWidget {
  const _FareBreakdownCard({required this.total});

  final String total;

  @override
  Widget build(BuildContext context) => _Panel(
        padding: 16,
        children: [
          const Text('車資',
              style: TextStyle(
                  fontSize: DriverTypography.body,
                  fontWeight: FontWeight.w500,
                  color: DriverColors.text)),
          _FareTotal(total: total),
        ],
      );
}

class _InfoRow extends StatelessWidget {
  const _InfoRow({required this.label, required this.value});
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) => Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
              width: 70,
              child: Text(label,
                  style: const TextStyle(
                      fontSize: DriverTypography.body,
                      color: DriverColors.secondaryText))),
          const SizedBox(width: DriverSpacing.md),
          Expanded(
              child: Text(value,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                      fontSize: DriverTypography.body,
                      fontWeight: FontWeight.w500,
                      color: DriverColors.text))),
        ],
      );
}

class _FareTotal extends StatelessWidget {
  const _FareTotal({required this.total});

  final String total;

  @override
  Widget build(BuildContext context) => Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          const Text('總計應收',
              style: TextStyle(
                  fontSize: DriverTypography.bodyLarge,
                  fontWeight: FontWeight.w700,
                  color: DriverColors.text)),
          Text(total,
              style: const TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.w700,
                  color: DriverColors.success)),
        ],
      );
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
        child:
            Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          for (var index = 0; index < children.length; index++)
            Padding(
                padding: EdgeInsets.only(
                    bottom: index == children.length - 1 ? 0 : 12),
                child: children[index]),
        ]),
      );
}

ButtonStyle _completeStyle() => ElevatedButton.styleFrom(
      minimumSize: const Size.fromHeight(56),
      foregroundColor: DriverColors.surface,
      backgroundColor: DriverColors.activeBlue,
      elevation: 0,
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
      shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(DriverRadii.card)),
      textStyle: const TextStyle(
          fontSize: DriverTypography.bodyLarge, fontWeight: FontWeight.w700),
    );
