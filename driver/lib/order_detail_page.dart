import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

class OrderDetailPage extends StatefulWidget {
  const OrderDetailPage({super.key});

  @override
  State<OrderDetailPage> createState() => _OrderDetailPageState();
}

class _OrderDetailPageState extends State<OrderDetailPage> {
  int _selectedVehicle = 0;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xfff0f2f5),
      body: SafeArea(
        child: Align(
          alignment: Alignment.topCenter,
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 430),
            child: SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(24, 24, 24, 32),
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
                              style: TextStyle(
                                  fontSize: 18, color: Color(0xff1c1c2e))),
                        ),
                      ),
                      const SizedBox(width: 8),
                      const Text('訂單詳情',
                          style: TextStyle(
                              fontSize: 24,
                              fontWeight: FontWeight.w700,
                              color: Color(0xff1c1c2e))),
                    ],
                  ),
                  const SizedBox(height: 8),
                  const Text('請確認乘客資訊與行程內容',
                      style: TextStyle(fontSize: 14, color: Color(0xff56657e))),
                  const SizedBox(height: 24),
                  const _MapPreview(),
                  const SizedBox(height: 24),
                  const _OrderInfoCard(),
                  const SizedBox(height: 24),
                  const Text('選擇接單車輛',
                      style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w700,
                          color: Color(0xff1c1c2e))),
                  const SizedBox(height: 12),
                  Row(children: [
                    Expanded(
                        child: _VehicleCard(
                            index: 0,
                            title: '車輛 1',
                            type: '轎車',
                            plate: 'AB 1234',
                            selected: _selectedVehicle == 0,
                            onTap: () => setState(() => _selectedVehicle = 0))),
                    const SizedBox(width: 12),
                    Expanded(
                        child: _VehicleCard(
                            index: 1,
                            title: '車輛 2',
                            type: 'MPV',
                            plate: 'CD 5678',
                            selected: _selectedVehicle == 1,
                            onTap: () => setState(() => _selectedVehicle = 1))),
                  ]),
                  const SizedBox(height: 24),
                  Row(children: [
                    Expanded(
                        child: OutlinedButton(
                            onPressed: () => Navigator.of(context).pop(),
                            style: _secondaryButtonStyle(),
                            child: const Text('拒絕'))),
                    const SizedBox(width: 12),
                    Expanded(
                        child: ElevatedButton(
                            onPressed: () {},
                            style: _primaryButtonStyle(),
                            child: const Text('確認接單'))),
                  ]),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

ButtonStyle _secondaryButtonStyle() => OutlinedButton.styleFrom(
      minimumSize: const Size.fromHeight(56),
      foregroundColor: const Color(0xff1c1c2e),
      backgroundColor: Colors.white,
      side: const BorderSide(color: Color(0xffe5e7eb)),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      textStyle: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
    );

ButtonStyle _primaryButtonStyle() => ElevatedButton.styleFrom(
      minimumSize: const Size.fromHeight(56),
      foregroundColor: Colors.white,
      backgroundColor: const Color(0xff285cfc),
      elevation: 0,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      textStyle: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
    );

class _MapPreview extends StatelessWidget {
  const _MapPreview();
  @override
  Widget build(BuildContext context) => Container(
        height: 180,
        decoration: BoxDecoration(
            color: const Color(0xff1c1c2e),
            borderRadius: BorderRadius.circular(16),
            boxShadow: const [
              BoxShadow(
                  color: Color(0x1a000000),
                  blurRadius: 24,
                  offset: Offset(0, 8))
            ]),
        child: Stack(children: [
          const Center(
              child: Column(mainAxisSize: MainAxisSize.min, children: [
            Text('地圖路徑預覽',
                style: TextStyle(fontSize: 13, color: Color(0xb3ffffff))),
            SizedBox(height: 8),
            Text('香港中環 → 深圳',
                style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    color: Colors.white))
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
          borderRadius: BorderRadius.circular(100)),
      child: Text(label,
          style: const TextStyle(fontSize: 12, color: Colors.white)));
}

class _OrderInfoCard extends StatelessWidget {
  const _OrderInfoCard();
  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
            color: Colors.white,
            border: Border.all(color: const Color(0xffe5e7eb)),
            borderRadius: BorderRadius.circular(16),
            boxShadow: const [
              BoxShadow(
                  color: Color(0x0a000000), blurRadius: 4, offset: Offset(0, 2))
            ]),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Row(children: [
            Expanded(
                child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                  Text('陳大文',
                      style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                          color: Color(0xff1c1c2e))),
                  SizedBox(height: 4),
                  Text('香港中環 → 深圳',
                      style: TextStyle(fontSize: 13, color: Color(0xff57667d))),
                  SizedBox(height: 4),
                  Text('2024/03/15 14:00',
                      style: TextStyle(fontSize: 13, color: Color(0xff56657e)))
                ]))
          ]),
          const SizedBox(height: 12),
          const _AddressRow(
              asset: 'assets/order-detail-origin.svg', label: '香港中環置地廣場東門大堂'),
          const SizedBox(height: 8),
          const _AddressRow(
              asset: 'assets/order-detail-destination.svg', label: '深圳福田口岸'),
          const SizedBox(height: 12),
          const Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('預估 18 分鐘',
                    style: TextStyle(fontSize: 13, color: Color(0xff56657e))),
                Text('\$280.00',
                    style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.w700,
                        color: Color(0xff4cd964)))
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
        const SizedBox(width: 8),
        Expanded(
            child: Text(label,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontSize: 14, color: Color(0xff1c1c2e))))
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
          borderRadius: BorderRadius.circular(16),
          child: Container(
            height: 116,
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
                color: Colors.white,
                border: Border.all(
                    color: selected
                        ? const Color(0xff285cfc)
                        : const Color(0xffe5e7eb),
                    width: selected ? 2 : 1),
                borderRadius: BorderRadius.circular(16)),
            child: Stack(children: [
              Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Container(
                    width: 32,
                    height: 32,
                    decoration: BoxDecoration(
                        color: selected
                            ? const Color(0xffeaf0ff)
                            : const Color(0xfff0f2f5),
                        borderRadius: BorderRadius.circular(16)),
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
                          fontSize: 14,
                          fontWeight: FontWeight.w700,
                          color: Color(0xff1c1c2e))),
                  const SizedBox(height: 2),
                  Text(type,
                      style: const TextStyle(
                          fontSize: 12, color: Color(0xff56657e)))
                ])
              ]),
              Positioned(
                  left: 0,
                  bottom: 0,
                  child: Text(plate,
                      style: const TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w700,
                          color: Color(0xff1c1c2e)))),
              Positioned(
                  right: 0,
                  bottom: 0,
                  child: Container(
                      width: 20,
                      height: 20,
                      decoration: BoxDecoration(
                          color:
                              selected ? const Color(0xff4a6cf7) : Colors.white,
                          border: selected
                              ? null
                              : Border.all(color: const Color(0xffd9d9d9)),
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
