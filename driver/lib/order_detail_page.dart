import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

import 'app/route_names.dart';
import 'core/api/driver_api_client.dart';
import 'core/layout/driver_page_shell.dart';
import 'core/navigation/driver_navigation.dart';

import 'package:driver_web/core/tokens/driver_tokens.dart';

class OrderDetailPage extends StatefulWidget {
  const OrderDetailPage({super.key, this.tripId});
  final String? tripId;

  @override
  State<OrderDetailPage> createState() => _OrderDetailPageState();
}

class _OrderDetailPageState extends State<OrderDetailPage> {
  final _api = DriverApiClient.instance;
  int _selectedVehicle = 0;
  bool _accepting = false;

  Future<void> _acceptTrip() async {
    if (widget.tripId == null) return;
    setState(() => _accepting = true);
    try {
      await _api.acceptTrip(widget.tripId!);
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

  @override
  Widget build(BuildContext context) {
    return DriverPageShell(
      selectedIndex: 1,
      showBottomNavigation: false,
      topPadding: 24,
      horizontalPadding: 24,
      bottomPadding: 32,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Semantics(
                button: true,
                label: '返回接單大廳',
                child: IconButton(
                  onPressed: () => Navigator.of(context).pop(),
                  padding: EdgeInsets.zero,
                  constraints:
                      const BoxConstraints(minWidth: 44, minHeight: 44),
                  icon: const Text('<',
                      style: TextStyle(fontSize: 18, color: DriverColors.text)),
                ),
              ),
              const SizedBox(width: DriverSpacing.sm),
              const Text('訂單詳情',
                  style: TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.w700,
                      color: DriverColors.text)),
            ],
          ),
          const SizedBox(height: DriverSpacing.sm),
          const Text('請確認乘客資訊與行程內容',
              style: TextStyle(
                  fontSize: DriverTypography.body,
                  color: DriverColors.secondaryText)),
          const SizedBox(height: DriverSpacing.xl),
          const _MapPreview(),
          const SizedBox(height: DriverSpacing.xl),
          const _OrderInfoCard(),
          const SizedBox(height: DriverSpacing.xl),
          const Text('選擇接單車輛',
              style: TextStyle(
                  fontSize: DriverTypography.body,
                  fontWeight: FontWeight.w700,
                  color: DriverColors.text)),
          const SizedBox(height: DriverSpacing.md),
          Row(children: [
            Expanded(
                child: _VehicleCard(
                    index: 0,
                    title: '車輛 1',
                    type: '轎車',
                    plate: 'AB 1234',
                    selected: _selectedVehicle == 0,
                    onTap: () => setState(() => _selectedVehicle = 0))),
            const SizedBox(width: DriverSpacing.md),
            Expanded(
                child: _VehicleCard(
                    index: 1,
                    title: '車輛 2',
                    type: 'MPV',
                    plate: 'CD 5678',
                    selected: _selectedVehicle == 1,
                    onTap: () => setState(() => _selectedVehicle = 1))),
          ]),
          const SizedBox(height: DriverSpacing.xl),
          Row(children: [
            Expanded(
                child: OutlinedButton(
                    onPressed: () => Navigator.of(context).pop(),
                    style: _secondaryButtonStyle(),
                    child: const Text('拒絕'))),
            const SizedBox(width: DriverSpacing.md),
            Expanded(
                child: ElevatedButton(
                    onPressed: _accepting ? null : _acceptTrip,
                    style: _primaryButtonStyle(),
                    child: Text(_accepting ? '處理中…' : '確認接單'))),
          ]),
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

class _MapPreview extends StatelessWidget {
  const _MapPreview();
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
          const Center(
              child: Column(mainAxisSize: MainAxisSize.min, children: [
            Text('地圖路徑預覽',
                style: TextStyle(
                    fontSize: DriverTypography.label,
                    color: Color(0xb3ffffff))),
            SizedBox(height: 8),
            Text('香港中環 → 深圳',
                style: TextStyle(
                    fontSize: DriverTypography.bodyLarge,
                    fontWeight: FontWeight.w700,
                    color: DriverColors.surface))
          ])),
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

class _OrderInfoCard extends StatelessWidget {
  const _OrderInfoCard();
  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
            color: DriverColors.surface,
            border: Border.all(color: DriverColors.divider),
            borderRadius: BorderRadius.circular(DriverRadii.card),
            boxShadow: const [
              BoxShadow(
                  color: Color(0x1238434a), blurRadius: 4, offset: Offset(0, 2))
            ]),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
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
              const Expanded(
                child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('陳大文',
                          style: TextStyle(
                              fontSize: DriverTypography.bodyLarge,
                              fontWeight: FontWeight.w700,
                              color: DriverColors.text)),
                      SizedBox(height: 4),
                      Text('香港中環 → 深圳',
                          style: TextStyle(
                              fontSize: DriverTypography.label,
                              color: Color(0xff57667d))),
                      SizedBox(height: 4),
                      Text('2024/03/15 14:00',
                          style: TextStyle(
                              fontSize: DriverTypography.label,
                              color: DriverColors.secondaryText))
                    ]),
              ),
            ],
          ),
          const SizedBox(height: DriverSpacing.md),
          const _AddressRow(
              asset: 'assets/order-detail-origin.svg', label: '香港中環置地廣場東門大堂'),
          const SizedBox(height: DriverSpacing.md),
          const _AddressRow(
              asset: 'assets/order-detail-destination.svg', label: '深圳福田口岸'),
          const SizedBox(height: DriverSpacing.md),
          const Row(crossAxisAlignment: CrossAxisAlignment.center, children: [
            Expanded(
                child: Text('出發時間  2024/03/15 14:00',
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                        fontSize: DriverTypography.label,
                        color: DriverColors.secondaryText))),
            SizedBox(width: 12),
            Text('\$280.00',
                style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.w700,
                    color: DriverColors.success))
          ]),
        ]),
      );
}

class _AddressRow extends StatelessWidget {
  const _AddressRow({required this.asset, required this.label});
  final String asset;
  final String label;
  @override
  Widget build(BuildContext context) => Row(children: [
        SvgPicture.asset(asset, width: 8, height: 8),
        const SizedBox(width: DriverSpacing.sm),
        Expanded(
            child: Text(label,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                    fontSize: DriverTypography.body, color: DriverColors.text)))
      ]);
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
