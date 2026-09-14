import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

import 'app/router.dart';
import 'core/layout/driver_page_shell.dart';
import 'core/navigation/driver_navigation.dart';

class OrderAcceptedPage extends StatelessWidget {
  const OrderAcceptedPage({super.key});

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
                InkWell(
                  onTap: () => Navigator.of(context).pop(),
                  child: Row(children: [
                    const Text('<',
                        style:
                            TextStyle(fontSize: 20, color: Color(0xff1c1c2e))),
                    const SizedBox(width: 8),
                    const Text('返回接單大廳',
                        style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w500,
                            color: Color(0xff1c1c2e))),
                  ]),
                ),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                  decoration: BoxDecoration(
                      color: const Color(0xffebf9f1),
                      borderRadius: BorderRadius.circular(100)),
                  child: const Text('成功接單',
                      style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w700,
                          color: Color(0xff4cd964))),
                ),
              ],
            ),
            const SizedBox(height: 24),
            const _AcceptedMapPreview(),
            const SizedBox(height: 24),
            const _AcceptedOrderCard(),
            const SizedBox(height: 24),
            const _AcceptedVehicleCard(),
            const SizedBox(height: 24),
            Row(children: [
              Expanded(
                  child: OutlinedButton(
                      onPressed: () => Navigator.of(context).pop(),
                      style: _cancelStyle(),
                      child: const Text('取消訂單'))),
              const SizedBox(width: 12),
              Expanded(
                  child: ElevatedButton(
                onPressed: () => DriverNavigation.push(
                    context, DriverRoutes.orderInProgress),
                style: _arrivedStyle(),
                child: const Text('已到達上車點'),
              )),
            ]),
          ],
        ),
      ),
    );
  }
}

class _AcceptedMapPreview extends StatelessWidget {
  const _AcceptedMapPreview();
  @override
  Widget build(BuildContext context) => Container(
        height: 180,
        decoration: BoxDecoration(
            color: const Color(0xff1c1c2e),
            borderRadius: BorderRadius.circular(16)),
        child: Stack(children: [
          const Center(
              child: Column(mainAxisSize: MainAxisSize.min, children: [
            Text('地圖路徑預覽',
                style: TextStyle(fontSize: 13, color: Color(0xb3ffffff))),
            SizedBox(height: 12),
            _MapRouteText(),
          ])),
          const Positioned(top: 16, left: 16, child: _MapLabel('起點')),
          const Positioned(top: 16, right: 16, child: _MapLabel('終點')),
        ]),
      );
}

class _MapRouteText extends StatelessWidget {
  const _MapRouteText();
  @override
  Widget build(BuildContext context) => Column(children: [
        Row(mainAxisSize: MainAxisSize.min, children: [
          SvgPicture.asset('assets/order-detail-origin.svg',
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
          SvgPicture.asset('assets/order-detail-destination.svg',
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

class _AcceptedOrderCard extends StatelessWidget {
  const _AcceptedOrderCard();
  @override
  Widget build(BuildContext context) => _Panel(
        padding: 20,
        children: [
          Row(children: [
            Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                    color: const Color(0xffebf9f1),
                    borderRadius: BorderRadius.circular(18))),
            const SizedBox(width: 12),
            const Text('接單成功',
                style: TextStyle(
                    fontSize: 18,
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

class _AcceptedVehicleCard extends StatelessWidget {
  const _AcceptedVehicleCard();
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
                    color: const Color(0xffeaf0ff),
                    borderRadius: BorderRadius.circular(18)),
                child: SvgPicture.asset('assets/order-detail-car.svg',
                    width: 20, height: 20)),
            const SizedBox(width: 10),
            const Expanded(
                child: Text('兩地牌轎車',
                    style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w700,
                        color: Color(0xff1c1c2e)))),
            const Text('更換',
                style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: Color(0xff285cfc))),
          ]),
          const Divider(height: 1, color: Color(0xfff0f2f5)),
          const _VehicleInfoRow(label: '香港車牌', value: 'AB 1234'),
          const _VehicleInfoRow(label: '車輛顏色', value: '白色'),
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
            style: const TextStyle(fontSize: 14, color: Color(0xff56657e))),
        Text(value,
            style: const TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w700,
                color: Color(0xff1c1c2e))),
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
    backgroundColor: Colors.white,
    side: const BorderSide(color: Color(0xffd9d9d9)),
    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
    textStyle: const TextStyle(fontSize: 16, fontWeight: FontWeight.w500));
ButtonStyle _arrivedStyle() => ElevatedButton.styleFrom(
    minimumSize: const Size.fromHeight(54),
    foregroundColor: Colors.white,
    backgroundColor: const Color(0xff285cfc),
    elevation: 0,
    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
    textStyle: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700));
