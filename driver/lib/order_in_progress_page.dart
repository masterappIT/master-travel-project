import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'core/layout/driver_page_shell.dart';
import 'order_completed_page.dart';

class OrderInProgressPage extends StatelessWidget {
  const OrderInProgressPage({super.key});

  @override
  Widget build(BuildContext context) {
    return DriverPageShell(
      selectedIndex: 1,
      showBottomNavigation: false,
      topPadding: 24,
      horizontalPadding: 24,
      bottomPadding: 24,
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
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
                      const SizedBox(width: 8),
                      Text('返回接單大廳',
                          style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w500,
                              color: Color(0xff1c1c2e))),
                    ]),
                  ),
                ),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                  decoration: BoxDecoration(
                      color: const Color(0xffeaf0ff),
                      borderRadius: BorderRadius.circular(100)),
                  child: const Text('進行中',
                      style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w700,
                          color: Color(0xff285cfc))),
                ),
              ],
            ),
            const SizedBox(height: 24),
            const _ProgressMapPreview(),
            const SizedBox(height: 24),
            const _PassengerCard(),
            const SizedBox(height: 24),
            const _TripProgressCard(),
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: () => Navigator.of(context).push(
                  MaterialPageRoute<void>(
                      builder: (_) => const OrderCompletedPage())),
              style: _completeStyle(),
              child: const Text('完成'),
            ),
          ],
        ),
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
            color: const Color(0xff1c1c2e),
            borderRadius: BorderRadius.circular(16)),
        child: Stack(children: [
          const Center(
              child: Column(mainAxisSize: MainAxisSize.min, children: [
            Text('香港中環 → 深圳',
                style: TextStyle(fontSize: 13, color: Color(0xb3ffffff))),
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
          const SizedBox(width: 8),
          const Text('香港中環',
              style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                  color: Colors.white)),
        ]),
        const SizedBox(height: 4),
        const Text('│',
            style: TextStyle(fontSize: 12, color: Color(0xff80a0ff))),
        const SizedBox(height: 4),
        Row(mainAxisSize: MainAxisSize.min, children: [
          SvgPicture.asset('assets/in-progress-destination.svg',
              width: 8, height: 8),
          const SizedBox(width: 8),
          const Text('深圳',
              style: TextStyle(
                  fontSize: 16,
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
          borderRadius: BorderRadius.circular(100)),
      child: Text(label,
          style: const TextStyle(fontSize: 12, color: Colors.white)));
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
                    color: const Color(0xfff0f2f5),
                    borderRadius: BorderRadius.circular(24)),
                child: const Text('陳',
                    style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w700,
                        color: Color(0xff1c1c2e)))),
            const SizedBox(width: 12),
            Expanded(
                child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                  Text('陳大文',
                      style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                          color: Color(0xff1c1c2e))),
                  SizedBox(height: 2),
                  Row(children: [
                    SvgPicture.asset('assets/in-progress-star.svg',
                        width: 12, height: 12),
                    SizedBox(width: 4),
                    Text('乘客好評度 4.9',
                        style:
                            TextStyle(fontSize: 13, color: Color(0xff56657e))),
                  ]),
                ])),
            _CircleAssetButton(asset: 'assets/in-progress-phone.svg'),
            const SizedBox(width: 8),
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
            color:
                highlighted ? const Color(0xffeaf0ff) : const Color(0xfff0f2f5),
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
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    color: Color(0xff1c1c2e))),
          ]),
          const Divider(height: 1, color: Color(0xfff0f2f5)),
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
                style:
                    const TextStyle(fontSize: 14, color: Color(0xff56657e)))),
        const SizedBox(width: 12),
        Expanded(
            child: Text(value,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                    fontSize: 14,
                    fontWeight: bold ? FontWeight.w700 : FontWeight.w500,
                    color: const Color(0xff1c1c2e)))),
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
            color: Colors.white,
            border: Border.all(color: const Color(0xffe5e7eb)),
            borderRadius: BorderRadius.circular(16),
            boxShadow: const [
              BoxShadow(
                  color: Color(0x0a000000), blurRadius: 4, offset: Offset(0, 2))
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
      foregroundColor: Colors.white,
      backgroundColor: const Color(0xff285cfc),
      elevation: 0,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      textStyle: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
    );
