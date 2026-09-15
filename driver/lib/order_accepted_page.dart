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
  bool _loading = false;

  Future<void> _markArrived() async {
    setState(() => _loading = true);
    try {
      final tripId = widget.tripId;
      if (tripId == null) throw StateError('missing trip id');
      await _api.arriveTrip(tripId);
      await _api.startTrip(tripId);
      if (mounted) {
        DriverNavigation.push(
          context,
          DriverRouteNames.orderInProgress,
          arguments: widget.tripId,
        );
      }
    } on StateError {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(const SnackBar(content: Text('找不到可到達的訂單')));
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
          const _AcceptedMapPreview(),
          const SizedBox(height: DriverSpacing.xl),
          const _AcceptedOrderCard(),
          const SizedBox(height: DriverSpacing.xl),
          const _AcceptedVehicleCard(),
          const SizedBox(height: DriverSpacing.xl),
          Row(children: [
            Expanded(
                child: OutlinedButton(
                    onPressed: () => Navigator.of(context).pop(),
                    style: _cancelStyle(),
                    child: const Text('取消訂單'))),
            const SizedBox(width: DriverSpacing.md),
            Expanded(
                child: ElevatedButton(
              onPressed: _loading ? null : _markArrived,
              style: _arrivedStyle(),
              child: Text(_loading ? '處理中…' : '已到達上車點'),
            )),
          ]),
        ],
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
            color: DriverColors.text,
            borderRadius: BorderRadius.circular(DriverRadii.card)),
        child: Stack(children: [
          const Center(
              child: Column(mainAxisSize: MainAxisSize.min, children: [
            Text('地圖路徑預覽',
                style: TextStyle(
                    fontSize: DriverTypography.label,
                    color: Color(0xb3ffffff))),
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
          const SizedBox(width: DriverSpacing.sm),
          const Text('香港中環',
              style: TextStyle(
                  fontSize: DriverTypography.bodyLarge,
                  fontWeight: FontWeight.w700,
                  color: Colors.white)),
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
                    color: DriverColors.infoBackground,
                    borderRadius: BorderRadius.circular(18)),
                child: SvgPicture.asset('assets/order-detail-car.svg',
                    width: 20, height: 20)),
            const SizedBox(width: 10),
            const Expanded(
                child: Text('兩地牌轎車',
                    style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w700,
                        color: DriverColors.text))),
            const Text('更換',
                style: TextStyle(
                    fontSize: DriverTypography.body,
                    fontWeight: FontWeight.w700,
                    color: DriverColors.activeBlue)),
          ]),
          const Divider(height: 1, color: DriverColors.background),
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
            color: Colors.white,
            border: Border.all(color: DriverColors.divider),
            borderRadius: BorderRadius.circular(DriverRadii.card),
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
    side: const BorderSide(color: DriverColors.border),
    shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(DriverRadii.card)),
    textStyle: const TextStyle(
        fontSize: DriverTypography.bodyLarge, fontWeight: FontWeight.w500));
ButtonStyle _arrivedStyle() => ElevatedButton.styleFrom(
    minimumSize: const Size.fromHeight(54),
    foregroundColor: Colors.white,
    backgroundColor: DriverColors.activeBlue,
    elevation: 0,
    shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(DriverRadii.card)),
    textStyle: const TextStyle(
        fontSize: DriverTypography.bodyLarge, fontWeight: FontWeight.w700));
