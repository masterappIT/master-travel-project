import 'package:flutter/material.dart';
import 'core/widgets/driver_overlays.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'app/route_names.dart';
import 'core/api/driver_api_client.dart';
import 'core/formatters/passenger_name.dart';
import 'core/layout/driver_page_shell.dart';
import 'core/navigation/driver_navigation.dart';

import 'package:driver_web/core/tokens/driver_tokens.dart';

class OrderInProgressPage extends StatefulWidget {
  const OrderInProgressPage({super.key, this.tripId});

  final String? tripId;

  @override
  State<OrderInProgressPage> createState() => _OrderInProgressPageState();
}

class _OrderInProgressPageState extends State<OrderInProgressPage> {
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
    return '${date.year}/${two(date.month)}/${two(date.day)} ${two(date.hour)}:${two(date.minute)}';
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

  Future<void> _completeTrip() async {
    setState(() => _loading = true);
    try {
      final tripId = widget.tripId;
      if (tripId == null) throw StateError('missing trip id');
      await _api.completeTrip(tripId);
      if (mounted) {
        DriverNavigation.push(
          context,
          DriverRouteNames.orderCompleted,
          arguments: tripId,
        );
      }
    } on StateError {
      if (mounted) {
        showDriverNotice(context, '找不到進行中的訂單');
      }
    } on DriverApiException catch (error) {
      if (mounted) {
        showDriverNotice(context, error.message);
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
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
              Semantics(
                button: true,
                label: '返回接單大廳',
                child: InkWell(
                  onTap: () => Navigator.of(context).pop(),
                  child: Row(children: [
                    SvgPicture.asset('assets/in-progress-chevron-left.svg',
                        width: 20, height: 20),
                    const SizedBox(width: DriverSpacing.sm),
                    Text('返回接單大廳',
                        style: TextStyle(
                            fontSize: DriverTypography.bodyLarge,
                            fontWeight: FontWeight.w500,
                            color: DriverColors.text)),
                  ]),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(
                    horizontal: DriverSpacing.md, vertical: DriverSpacing.xs),
                decoration: BoxDecoration(
                    color: DriverColors.infoBackground,
                    borderRadius: BorderRadius.circular(DriverRadii.pill)),
                child: const Text('進行中',
                    style: TextStyle(
                        fontSize: DriverTypography.label,
                        fontWeight: FontWeight.w700,
                        color: DriverColors.activeBlue)),
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
            Center(
              child: Column(
                children: [
                  Text(_error!, textAlign: TextAlign.center),
                  const SizedBox(height: DriverSpacing.md),
                  OutlinedButton(
                      onPressed: _loadTrip, child: const Text('重新載入')),
                ],
              ),
            )
          else ...[
            _ProgressMapPreview(
              origin: _region(_text('pickupAddress', '起點待確認'), '起點待確認'),
              destination: _region(_text('dropoffAddress', '終點待確認'), '終點待確認'),
            ),
            const SizedBox(height: DriverSpacing.xl),
            _PassengerCard(name: formatPassengerName(_trip)),
            const SizedBox(height: DriverSpacing.xl),
            _TripProgressCard(
              origin: _text('pickupAddress', '起點待確認'),
              destination: _text('dropoffAddress', '終點待確認'),
              scheduledAt: _formatDate(_trip?['scheduledAt']),
              passenger: formatPassengerName(_trip),
              price: _formatPrice(_trip?['price'], _trip?['currency']),
            ),
            const SizedBox(height: DriverSpacing.xl),
            ElevatedButton(
              onPressed: _loading ? null : _completeTrip,
              style: _completeStyle(),
              child: Text(_loading ? '處理中…' : '確認到達目的地'),
            ),
          ],
        ],
      ),
    );
  }
}

class _ProgressMapPreview extends StatelessWidget {
  const _ProgressMapPreview({required this.origin, required this.destination});
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
            Text('$origin → $destination',
                style: TextStyle(
                    fontSize: DriverTypography.label,
                    color: Color(0xb3ffffff))),
            SizedBox(height: DriverSpacing.md),
            _RouteText(origin: origin, destination: destination),
          ])),
          const Positioned(
              top: DriverSpacing.lg,
              left: DriverSpacing.lg,
              child: _MapLabel('起點')),
          const Positioned(
              top: DriverSpacing.lg,
              right: DriverSpacing.lg,
              child: _MapLabel('終點')),
        ]),
      );
}

class _RouteText extends StatelessWidget {
  const _RouteText({required this.origin, required this.destination});
  final String origin;
  final String destination;

  @override
  Widget build(BuildContext context) => Column(children: [
        Row(mainAxisSize: MainAxisSize.min, children: [
          SvgPicture.asset('assets/in-progress-origin.svg',
              width: 8, height: 8),
          const SizedBox(width: DriverSpacing.sm),
          Text(origin,
              style: TextStyle(
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
          SvgPicture.asset('assets/in-progress-destination.svg',
              width: 8, height: 8),
          const SizedBox(width: DriverSpacing.sm),
          Text(destination,
              style: TextStyle(
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

class _PassengerCard extends StatelessWidget {
  const _PassengerCard({required this.name});
  final String name;

  @override
  Widget build(BuildContext context) => _Panel(
        padding: 16,
        children: [
          Row(children: [
            Container(
                width: 48,
                height: 48,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                    color: DriverColors.background,
                    borderRadius: BorderRadius.circular(24)),
                child: Text(
                    name.isEmpty ? '乘' : String.fromCharCode(name.runes.first),
                    style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w700,
                        color: DriverColors.text))),
            const SizedBox(width: DriverSpacing.md),
            Expanded(
                child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                  PassengerNameText(
                    name,
                    style: const TextStyle(
                      fontSize: DriverTypography.bodyLarge,
                      fontWeight: FontWeight.w700,
                      color: DriverColors.text,
                    ),
                  ),
                  SizedBox(height: 2),
                  Row(children: [
                    SvgPicture.asset('assets/in-progress-star.svg',
                        width: 12, height: 12),
                    SizedBox(width: DriverSpacing.xs),
                    Text('乘客好評度 4.9',
                        style: TextStyle(
                            fontSize: DriverTypography.label,
                            color: DriverColors.secondaryText)),
                  ]),
                ])),
            _CircleAssetButton(asset: 'assets/in-progress-phone.svg'),
            const SizedBox(width: DriverSpacing.sm),
            _CircleAssetButton(
                asset: 'assets/in-progress-arrow-right.svg', highlighted: true),
          ]),
        ],
      );
}

class _CircleAssetButton extends StatelessWidget {
  const _CircleAssetButton({required this.asset, this.highlighted = false});
  final String asset;
  final bool highlighted;
  @override
  Widget build(BuildContext context) => Container(
        width: 44,
        height: 44,
        alignment: Alignment.center,
        decoration: BoxDecoration(
            color: highlighted
                ? DriverColors.infoBackground
                : DriverColors.background,
            borderRadius: BorderRadius.circular(24)),
        child: SvgPicture.asset(asset, width: 20, height: 20),
      );
}

class _TripProgressCard extends StatelessWidget {
  const _TripProgressCard({
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
            SvgPicture.asset('assets/in-progress-route.svg',
                width: 20, height: 20),
            const SizedBox(width: 10),
            const Text('進行中',
                style: TextStyle(
                    fontSize: DriverTypography.bodyLarge,
                    fontWeight: FontWeight.w700,
                    color: DriverColors.text)),
          ]),
          const Divider(height: 1, color: DriverColors.background),
          _ProgressAddressPair(origin: origin, destination: destination),
          _InfoRow(label: '出發時間', value: scheduledAt),
          _InfoRow(label: '乘客', value: passenger),
          _InfoRow(label: '車資', value: price, bold: true),
        ],
      );
}

class _ProgressAddressPair extends StatefulWidget {
  const _ProgressAddressPair({required this.origin, required this.destination});

  final String origin;
  final String destination;

  @override
  State<_ProgressAddressPair> createState() => _ProgressAddressPairState();
}

class _ProgressAddressPairState extends State<_ProgressAddressPair> {
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
              _ProgressAddressColumn(
                  label: '出發地', value: widget.origin, expanded: _expanded),
              const SizedBox(height: DriverSpacing.lg),
              _ProgressAddressColumn(
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

class _ProgressAddressColumn extends StatelessWidget {
  const _ProgressAddressColumn(
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
            child: label == '乘客'
                ? PassengerNameText(
                    value,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: DriverTypography.body,
                      fontWeight: bold ? FontWeight.w700 : FontWeight.w500,
                      color: DriverColors.text,
                    ),
                  )
                : Text(value,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                        fontSize: DriverTypography.body,
                        fontWeight: bold ? FontWeight.w700 : FontWeight.w500,
                        color: DriverColors.text))),
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
        child:
            Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          for (var index = 0; index < children.length; index++)
            Padding(
                padding: EdgeInsets.only(
                    bottom: index == children.length - 1 ? 0 : 16),
                child: children[index]),
        ]),
      );
}

ButtonStyle _completeStyle() => ElevatedButton.styleFrom(
      minimumSize: const Size.fromHeight(56),
      foregroundColor: DriverColors.surface,
      backgroundColor: DriverColors.activeBlue,
      elevation: 0,
      shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(DriverRadii.card)),
      textStyle: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
    );
