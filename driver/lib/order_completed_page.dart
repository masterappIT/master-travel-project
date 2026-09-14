import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'app/route_names.dart';
import 'core/layout/driver_page_shell.dart';
import 'core/navigation/driver_navigation.dart';

import 'package:driver_web/core/tokens/driver_tokens.dart';

class OrderCompletedPage extends StatelessWidget {
  const OrderCompletedPage({super.key});

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
          const _CompletionHeader(),
          const SizedBox(height: DriverSpacing.xl),
          const _CompletedMapPreview(),
          const SizedBox(height: DriverSpacing.xl),
          const _OrderDetailsCard(),
          const SizedBox(height: DriverSpacing.xl),
          const _FareBreakdownCard(),
          const SizedBox(height: DriverSpacing.xl),
          ElevatedButton(
            onPressed: () {
              DriverNavigation.replaceAll(context, DriverRouteNames.orders);
            },
            style: _completeStyle(),
            child: const Text('確認完成'),
          ),
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
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
            color: DriverColors.successBackground,
            borderRadius: BorderRadius.circular(DriverRadii.pill)),
        child: SvgPicture.asset('assets/completed-check.svg',
            width: 24, height: 24),
      );
}

class _CompletedMapPreview extends StatelessWidget {
  const _CompletedMapPreview();

  @override
  Widget build(BuildContext context) => Container(
        height: 180,
        decoration: BoxDecoration(
            color: DriverColors.text,
            borderRadius: BorderRadius.circular(DriverRadii.card),
            boxShadow: const [
              BoxShadow(
                  color: Color(0x1a000000),
                  blurRadius: 24,
                  offset: Offset(0, 8))
            ]),
        child: Stack(children: [
          const Center(
              child: Column(mainAxisSize: MainAxisSize.min, children: [
            Text('城市天際線預覽',
                style: TextStyle(
                    fontSize: DriverTypography.label,
                    color: Color(0xb3ffffff))),
            SizedBox(height: 8),
            _CompletedRouteText(),
          ])),
          const Positioned(top: 16, left: 16, child: _MapLabel('起點')),
          const Positioned(top: 16, right: 16, child: _MapLabel('終點')),
        ]),
      );
}

class _CompletedRouteText extends StatelessWidget {
  const _CompletedRouteText();

  @override
  Widget build(BuildContext context) => Column(children: [
        Row(mainAxisSize: MainAxisSize.min, children: [
          SvgPicture.asset('assets/completed-origin.svg', width: 8, height: 8),
          const SizedBox(width: DriverSpacing.sm),
          const Text('香港中環',
              style: TextStyle(
                  fontSize: DriverTypography.bodyLarge,
                  fontWeight: FontWeight.w700,
                  color: Colors.white)),
        ]),
        const SizedBox(height: 2),
        const Text('│',
            style: TextStyle(
                fontSize: DriverTypography.caption, color: Color(0xff80a0ff))),
        const SizedBox(height: 2),
        Row(mainAxisSize: MainAxisSize.min, children: [
          SvgPicture.asset('assets/completed-destination.svg',
              width: 8, height: 8),
          const SizedBox(width: DriverSpacing.sm),
          const Text('深圳',
              style: TextStyle(
                  fontSize: DriverTypography.bodyLarge,
                  fontWeight: FontWeight.w700,
                  color: Colors.white)),
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
              fontSize: DriverTypography.caption, color: Colors.white)));
}

class _OrderDetailsCard extends StatelessWidget {
  const _OrderDetailsCard();

  @override
  Widget build(BuildContext context) => _Panel(
        padding: 16,
        children: [
          const Text('訂單詳情',
              style: TextStyle(
                  fontSize: DriverTypography.body,
                  fontWeight: FontWeight.w500,
                  color: DriverColors.text)),
          const _InfoRow(label: '出發地', value: '香港中環置地廣場東門大堂'),
          const _InfoRow(label: '目的地', value: '深圳福田口岸'),
          const _InfoRow(label: '出發時間', value: '2024/03/15 14:00'),
          const _InfoRow(label: '乘客', value: '陳大文'),
        ],
      );
}

class _FareBreakdownCard extends StatelessWidget {
  const _FareBreakdownCard();

  @override
  Widget build(BuildContext context) => _Panel(
        padding: 16,
        children: [
          const Text('車資明細',
              style: TextStyle(
                  fontSize: DriverTypography.body,
                  fontWeight: FontWeight.w500,
                  color: DriverColors.text)),
          const _FareRow(label: '起步價', value: '\$150.00'),
          const _FareRow(label: '里程費 (6.4 km × \$15)', value: '\$96.00'),
          const _FareRow(label: '時間費 (19.5 分鐘 × \$2.5)', value: '\$34.00'),
          SvgPicture.asset('assets/completed-divider.svg',
              width: double.infinity, height: 2),
          const _FareTotal(),
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

class _FareRow extends StatelessWidget {
  const _FareRow({required this.label, required this.value});
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) => Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Flexible(
              child: Text(label,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                      fontSize: DriverTypography.body,
                      color: DriverColors.secondaryText))),
          const SizedBox(width: DriverSpacing.md),
          Text(value,
              style: const TextStyle(
                  fontSize: DriverTypography.body, color: DriverColors.text)),
        ],
      );
}

class _FareTotal extends StatelessWidget {
  const _FareTotal();

  @override
  Widget build(BuildContext context) => Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        crossAxisAlignment: CrossAxisAlignment.center,
        children: const [
          Text('總計應收',
              style: TextStyle(
                  fontSize: DriverTypography.bodyLarge,
                  fontWeight: FontWeight.w700,
                  color: DriverColors.text)),
          Text('\$280.00',
              style: TextStyle(
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
            color: Colors.white,
            border: Border.all(color: DriverColors.divider),
            borderRadius: BorderRadius.circular(DriverRadii.card),
            boxShadow: const [
              BoxShadow(
                  color: Color(0x0a000000), blurRadius: 4, offset: Offset(0, 2))
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
      foregroundColor: Colors.white,
      backgroundColor: DriverColors.activeBlue,
      elevation: 0,
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
      shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(DriverRadii.card)),
      textStyle: const TextStyle(
          fontSize: DriverTypography.bodyLarge, fontWeight: FontWeight.w700),
    );
