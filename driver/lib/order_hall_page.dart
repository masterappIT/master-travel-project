import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'floating_nav_bar.dart';
import 'home_page.dart';
import 'profile_page.dart';
import 'order_detail_page.dart';

class OrderHallPage extends StatefulWidget {
  const OrderHallPage({super.key});

  @override
  State<OrderHallPage> createState() => _OrderHallPageState();
}

class _OrderHallPageState extends State<OrderHallPage> {
  int _selectedTab = 0;

  void _openOrderDetail() {
    Navigator.of(context)
        .push(MaterialPageRoute<void>(builder: (_) => const OrderDetailPage()));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xfff0f2f5),
      body: SafeArea(
        child: Align(
          alignment: Alignment.topCenter,
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 430),
            child: LayoutBuilder(
              builder: (context, constraints) {
                final contentWidth = constraints.maxWidth;
                return Stack(
                  children: [
                    Align(
                      alignment: Alignment.topCenter,
                      child: SizedBox(
                        width: contentWidth,
                        child: SingleChildScrollView(
                          padding: const EdgeInsets.fromLTRB(24, 24, 24, 104),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              Row(
                                  mainAxisAlignment:
                                      MainAxisAlignment.spaceBetween,
                                  children: const [
                                    Text('接單大廳',
                                        style: TextStyle(
                                            fontSize: 24,
                                            fontWeight: FontWeight.w700,
                                            color: Color(0xff1c1c2e))),
                                    _OnlineBadge()
                                  ]),
                              const SizedBox(height: 24),
                              _OrderTabs(
                                  selectedIndex: _selectedTab,
                                  onChanged: (index) =>
                                      setState(() => _selectedTab = index)),
                              const SizedBox(height: 12),
                              if (_selectedTab == 0) ...[
                                _OrderCard(
                                    time: '2024/03/15 14:00',
                                    price: '\$280.00',
                                    origin: '香港中環',
                                    destination: '深圳',
                                    passenger: '陳大文 · 6.2 km · 18 分鐘',
                                    onTap: _openOrderDetail),
                                const SizedBox(height: 12),
                                _OrderCard(
                                    time: '2024/03/15 15:30',
                                    price: '\$420.00',
                                    origin: '香港機場',
                                    destination: '珠海',
                                    passenger: '王小姐 · 34.5 km · 38 分鐘',
                                    onTap: _openOrderDetail),
                              ] else
                                const _EmptyAcceptedOrders(),
                            ],
                          ),
                        ),
                      ),
                    ),
                    Positioned(
                        left: contentWidth > 60 ? 30 : 12,
                        right: contentWidth > 60 ? 30 : 12,
                        bottom: 16,
                        child: FloatingNavBar(
                          selectedIndex: 1,
                          onHomeTap: () =>
                              Navigator.of(context).pushReplacement(
                            MaterialPageRoute<void>(
                              builder: (_) => const HomePage(),
                            ),
                          ),
                          onProfileTap: () =>
                              Navigator.of(context).pushReplacement(
                            MaterialPageRoute<void>(
                              builder: (_) => const ProfilePage(),
                            ),
                          ),
                        )),
                  ],
                );
              },
            ),
          ),
        ),
      ),
    );
  }
}

class _OnlineBadge extends StatelessWidget {
  const _OnlineBadge();

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
        decoration: BoxDecoration(
            color: const Color(0xff285cfc),
            borderRadius: BorderRadius.circular(100)),
        child: const Text('線上接單中',
            style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w700,
                color: Colors.white)),
      );
}

class _OrderTabs extends StatelessWidget {
  const _OrderTabs({required this.selectedIndex, required this.onChanged});
  final int selectedIndex;
  final ValueChanged<int> onChanged;

  @override
  Widget build(BuildContext context) => Wrap(
        spacing: 12,
        children: [
          _OrderTab(
              label: '可接單',
              selected: selectedIndex == 0,
              onTap: () => onChanged(0)),
          _OrderTab(
              label: '成功接單',
              selected: selectedIndex == 1,
              onTap: () => onChanged(1)),
        ],
      );
}

class _OrderTab extends StatelessWidget {
  const _OrderTab(
      {required this.label, required this.selected, required this.onTap});
  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Semantics(
        button: true,
        selected: selected,
        label: label,
        child: Material(
          color: Colors.transparent,
          child: InkWell(
            borderRadius: BorderRadius.circular(12),
            onTap: onTap,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              decoration: BoxDecoration(
                color: Colors.white,
                border: Border.all(
                    color: selected
                        ? const Color(0xff4a6cf7)
                        : const Color(0xffd9d9d9)),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text(label,
                  style: TextStyle(
                      fontSize: 14,
                      fontWeight: selected ? FontWeight.w700 : FontWeight.w400,
                      color: selected
                          ? const Color(0xff4a6cf7)
                          : const Color(0xff56657e))),
            ),
          ),
        ),
      );
}

class _OrderCard extends StatelessWidget {
  const _OrderCard(
      {required this.time,
      required this.price,
      required this.origin,
      required this.destination,
      required this.passenger,
      required this.onTap});
  final String time;
  final String price;
  final String origin;
  final String destination;
  final String passenger;
  final VoidCallback onTap;

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
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
              Flexible(
                  child: Text(time,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w500,
                          color: Color(0xff1c1c2e)))),
              const SizedBox(width: 12),
              Text(price,
                  style: const TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.w700,
                      color: Color(0xff4cd964))),
            ]),
            const SizedBox(height: 8),
            _Route(origin: origin, destination: destination),
            const SizedBox(height: 8),
            Row(children: [
              SvgPicture.asset('assets/route-driver.svg', width: 8, height: 8),
              const SizedBox(width: 8),
              Expanded(
                  child: Text(passenger,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                          fontSize: 14, color: Color(0xff56657e)))),
            ]),
            const SizedBox(height: 8),
            SizedBox(
              height: 44,
              child: ElevatedButton(
                onPressed: onTap,
                style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xff285cfc),
                    foregroundColor: Colors.white,
                    elevation: 0,
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12)),
                    padding: const EdgeInsets.symmetric(
                        horizontal: 16, vertical: 12)),
                child: const Text('接單',
                    style:
                        TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
              ),
            ),
          ],
        ),
      );
}

class _Route extends StatelessWidget {
  const _Route({required this.origin, required this.destination});
  final String origin;
  final String destination;

  @override
  Widget build(BuildContext context) => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _RouteRow(asset: 'assets/route-origin.svg', label: origin),
          const SizedBox(height: 2),
          _RouteRow(asset: 'assets/route-destination.svg', label: destination),
        ],
      );
}

class _RouteRow extends StatelessWidget {
  const _RouteRow({required this.asset, required this.label});
  final String asset;
  final String label;

  @override
  Widget build(BuildContext context) => Row(children: [
        SvgPicture.asset(asset, width: 8, height: 8),
        const SizedBox(width: 8),
        Expanded(
            child: Text(label,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w500,
                    color: Color(0xff1c1c2e)))),
      ]);
}

class _EmptyAcceptedOrders extends StatelessWidget {
  const _EmptyAcceptedOrders();

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
            color: Colors.white,
            border: Border.all(color: const Color(0xffe5e7eb)),
            borderRadius: BorderRadius.circular(16)),
        child: const Text('暫無成功接單',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 14, color: Color(0xff56657e))),
      );
}
