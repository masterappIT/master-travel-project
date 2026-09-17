import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'app/route_names.dart';
import 'core/api/driver_api_client.dart';
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
  bool _loading = false;

  Future<void> _completeTrip() async {
    setState(() => _loading = true);
    try {
      final tripId = widget.tripId;
      if (tripId == null) throw StateError('missing trip id');
      await _api.completeTrip(tripId);
      if (mounted) {
        DriverNavigation.push(context, DriverRouteNames.orderCompleted);
      }
    } on StateError {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(const SnackBar(content: Text('找不到進行中的訂單')));
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
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
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
          const _ProgressMapPreview(),
          const SizedBox(height: DriverSpacing.xl),
          const _PassengerCard(),
          const SizedBox(height: DriverSpacing.xl),
          const _TripProgressCard(),
          const SizedBox(height: DriverSpacing.xl),
          ElevatedButton(
            onPressed: _loading ? null : _completeTrip,
            style: _completeStyle(),
            child: Text(_loading ? '處理中…' : '確認到達目的地'),
          ),
        ],
      ),
    );
  }
}

class _ProgressMapPreview extends StatelessWidget {
  const _ProgressMapPreview();
  @override
  Widget build(BuildContext context) => Container(
        height: 180,
        decoration: BoxDecoration(
            color: DriverColors.text,
            borderRadius: BorderRadius.circular(DriverRadii.card)),
        child: Stack(children: [
          const Center(
              child: Column(mainAxisSize: MainAxisSize.min, children: [
            Text('香港中環 → 深圳',
                style: TextStyle(
                    fontSize: DriverTypography.label,
                    color: Color(0xb3ffffff))),
            SizedBox(height: 12),
            _RouteText(),
          ])),
          const Positioned(top: 16, left: 16, child: _MapLabel('起點')),
          const Positioned(top: 16, right: 16, child: _MapLabel('終點')),
        ]),
      );
}

class _RouteText extends StatelessWidget {
  const _RouteText();
  @override
  Widget build(BuildContext context) => Column(children: [
        Row(mainAxisSize: MainAxisSize.min, children: [
          SvgPicture.asset('assets/in-progress-origin.svg',
              width: 8, height: 8),
          const SizedBox(width: DriverSpacing.sm),
          const Text('香港中環',
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
          const Text('深圳',
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
  const _PassengerCard();
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
                child: const Text('陳',
                    style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w700,
                        color: DriverColors.text))),
            const SizedBox(width: DriverSpacing.md),
            Expanded(
                child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                  Text('陳大文',
                      style: TextStyle(
                          fontSize: DriverTypography.bodyLarge,
                          fontWeight: FontWeight.w700,
                          color: DriverColors.text)),
                  SizedBox(height: 2),
                  Row(children: [
                    SvgPicture.asset('assets/in-progress-star.svg',
                        width: 12, height: 12),
                    SizedBox(width: 4),
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
  const _TripProgressCard();
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
          const _InfoRow(label: '出發地', value: '香港中環置地廣場東門大堂'),
          const _InfoRow(label: '目的地', value: '深圳福田口岸'),
          const _InfoRow(label: '出發時間', value: '2024/03/15 14:00'),
          const _InfoRow(label: '乘客', value: '陳大文'),
          const _InfoRow(label: '車資', value: '\$280.00', bold: true),
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
