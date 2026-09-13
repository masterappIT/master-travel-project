import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

import 'floating_nav_bar.dart';
import 'order_hall_page.dart';
import 'profile_page.dart';

class HomePage extends StatefulWidget {
  const HomePage({super.key});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  bool _isOnline = true;

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
                          padding: const EdgeInsets.fromLTRB(24, 12, 24, 120),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              _ProfileHeader(
                                onNotificationTap: () {},
                              ),
                              const SizedBox(height: 20),
                              _StatusCard(
                                isOnline: _isOnline,
                                onChanged: (value) =>
                                    setState(() => _isOnline = value),
                              ),
                              const SizedBox(height: 20),
                              const _EarningsCard(),
                              const SizedBox(height: 20),
                              const _QuickStatsRow(),
                              const SizedBox(height: 20),
                              const _RecentOrdersSection(),
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
                        selectedIndex: 0,
                        onOrderTap: () => Navigator.of(context).push(
                          MaterialPageRoute<void>(
                            builder: (_) => const OrderHallPage(),
                          ),
                        ),
                        onProfileTap: () => Navigator.of(context).push(
                          MaterialPageRoute<void>(
                            builder: (_) => const ProfilePage(),
                          ),
                        ),
                      ),
                    ),
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

class _ProfileHeader extends StatelessWidget {
  const _ProfileHeader({required this.onNotificationTap});
  final VoidCallback onNotificationTap;

  @override
  Widget build(BuildContext context) => Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          const Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Text('陳大文',
                      style: TextStyle(
                          fontSize: 24,
                          fontWeight: FontWeight.w700,
                          color: Color(0xff1c1c2e))),
                  SizedBox(width: 8),
                  DecoratedBox(
                    decoration: BoxDecoration(
                        color: Color(0xffebf9f1),
                        borderRadius: BorderRadius.all(Radius.circular(100))),
                    child: Padding(
                      padding: EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                      child: Text('已認證司機',
                          style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w700,
                              color: Color(0xff2b7a42))),
                    ),
                  ),
                ],
              ),
              SizedBox(height: 4),
              Text('兩地牌 · 轎車',
                  style: TextStyle(fontSize: 13, color: Color(0xff56657e))),
            ],
          ),
          Semantics(
            button: true,
            label: '通知',
            child: InkWell(
              onTap: onNotificationTap,
              borderRadius: BorderRadius.circular(20),
              child: Container(
                width: 40,
                height: 40,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                    color: Colors.white,
                    border: Border.all(color: const Color(0xffe5e7eb)),
                    borderRadius: BorderRadius.circular(20)),
                child: SvgPicture.asset('assets/home-bell.svg',
                    width: 24, height: 24),
              ),
            ),
          ),
        ],
      );
}

class _StatusCard extends StatelessWidget {
  const _StatusCard({required this.isOnline, required this.onChanged});
  final bool isOnline;
  final ValueChanged<bool> onChanged;

  @override
  Widget build(BuildContext context) => InkWell(
        onTap: () => onChanged(!isOnline),
        borderRadius: BorderRadius.circular(16),
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
              color: Colors.white,
              border: Border.all(color: const Color(0xffe5e7eb)),
              borderRadius: BorderRadius.circular(16),
              boxShadow: const [
                BoxShadow(
                    color: Color(0x0a000000),
                    blurRadius: 4,
                    offset: Offset(0, 2))
              ]),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(children: [
                SvgPicture.asset('assets/home-status-dot.svg',
                    width: 12, height: 12),
                const SizedBox(width: 8),
                Text(isOnline ? '目前狀態：在線接單' : '目前狀態：離線',
                    style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                        color: Color(0xff1c1c2e))),
              ]),
              Semantics(
                toggled: isOnline,
                label: '在線接單切換',
                child: SvgPicture.asset('assets/home-toggle.svg',
                    width: 52, height: 30),
              ),
            ],
          ),
        ),
      );
}

class _EarningsCard extends StatelessWidget {
  const _EarningsCard();

  @override
  Widget build(BuildContext context) => _Card(
        padding: 20,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('今日收入',
                style: TextStyle(fontSize: 14, color: Color(0xff56657e))),
            const SizedBox(height: 4),
            const Text('\$1,280.00',
                style: TextStyle(
                    fontSize: 36,
                    fontWeight: FontWeight.w800,
                    color: Color(0xff1c1c2e))),
            const SizedBox(height: 16),
            SvgPicture.asset('assets/home-divider.svg',
                width: double.infinity, height: 1),
            const SizedBox(height: 16),
            const Row(children: [
              Expanded(child: _Stat(label: '今日接單', value: '3 單')),
              Expanded(child: _Stat(label: '在線時數', value: '4.5 小時')),
            ]),
          ],
        ),
      );
}

class _QuickStatsRow extends StatelessWidget {
  const _QuickStatsRow();

  @override
  Widget build(BuildContext context) => const Row(
        children: [
          Expanded(
              child: _Card(
                  padding: 16,
                  child:
                      _Stat(label: '本月收入', value: '\$12,680', valueSize: 20))),
          SizedBox(width: 16),
          Expanded(child: _Card(padding: 16, child: _RatingStat())),
        ],
      );
}

class _RecentOrdersSection extends StatelessWidget {
  const _RecentOrdersSection();

  @override
  Widget build(BuildContext context) => const Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
            Text('最近訂單',
                style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                    color: Color(0xff1c1c2e))),
            Text('查看全部',
                style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w500,
                    color: Color(0xff285cfc))),
          ]),
          SizedBox(height: 12),
          _RecentOrderCard(
              time: '2024/03/15 14:00',
              price: '\$280.00',
              origin: '香港中環',
              destination: '深圳',
              passenger: '陳先生',
              distance: '42.5 km · 50 分鐘'),
          SizedBox(height: 12),
          _RecentOrderCard(
              time: '2024/03/15 11:30',
              price: '\$420.00',
              origin: '香港機場',
              destination: '珠海',
              passenger: '王小姐',
              distance: '58.2 km · 65 分鐘'),
        ],
      );
}

class _RecentOrderCard extends StatelessWidget {
  const _RecentOrderCard(
      {required this.time,
      required this.price,
      required this.origin,
      required this.destination,
      required this.passenger,
      required this.distance});
  final String time, price, origin, destination, passenger, distance;

  @override
  Widget build(BuildContext context) => _Card(
        padding: 16,
        child:
            Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          Row(children: [
            Expanded(
              child: Text(time,
                  overflow: TextOverflow.ellipsis,
                  style:
                      const TextStyle(fontSize: 14, color: Color(0xff56657e))),
            ),
            const SizedBox(width: 8),
            Text(price,
                style: const TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.w700,
                    color: Color(0xff2b7a42))),
          ]),
          const SizedBox(height: 12),
          _RouteRow(asset: 'assets/home-origin-dot.svg', text: origin),
          const SizedBox(height: 8),
          _RouteRow(
              asset: 'assets/home-destination-dot.svg', text: destination),
          const SizedBox(height: 12),
          SvgPicture.asset('assets/home-order-divider.svg',
              width: double.infinity, height: 1),
          const SizedBox(height: 12),
          Row(children: [
            Expanded(
              child: Row(children: [
                SvgPicture.asset('assets/home-user.svg', width: 14, height: 14),
                const SizedBox(width: 6),
                Flexible(
                  child: Text(passenger,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                          fontSize: 13, color: Color(0xff56657e))),
                ),
              ]),
            ),
            const SizedBox(width: 8),
            Flexible(
              child: Text(distance,
                  overflow: TextOverflow.ellipsis,
                  textAlign: TextAlign.end,
                  style:
                      const TextStyle(fontSize: 13, color: Color(0xff56657e))),
            ),
          ]),
        ]),
      );
}

class _RouteRow extends StatelessWidget {
  const _RouteRow({required this.asset, required this.text});
  final String asset, text;

  @override
  Widget build(BuildContext context) => Row(children: [
        SvgPicture.asset(asset, width: 8, height: 8),
        const SizedBox(width: 8),
        Expanded(
            child: Text(text,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w500,
                    color: Color(0xff1c1c2e))))
      ]);
}

class _Stat extends StatelessWidget {
  const _Stat({required this.label, required this.value, this.valueSize = 18});
  final String label, value;
  final double valueSize;

  @override
  Widget build(BuildContext context) =>
      Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(label,
            style: const TextStyle(fontSize: 12, color: Color(0xff56657e))),
        const SizedBox(height: 2),
        Text(value,
            style: TextStyle(
                fontSize: valueSize,
                fontWeight: FontWeight.w700,
                color: const Color(0xff1c1c2e)))
      ]);
}

class _RatingStat extends StatelessWidget {
  const _RatingStat();

  @override
  Widget build(BuildContext context) =>
      Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Text('評分',
            style: TextStyle(fontSize: 13, color: Color(0xff56657e))),
        const SizedBox(height: 4),
        Row(children: [
          SvgPicture.asset('assets/home-star.svg', width: 16, height: 16),
          const SizedBox(width: 4),
          Flexible(
            child: Text('4.9 / 5.0',
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.w700,
                    color: Color(0xff1c1c2e))),
          )
        ])
      ]);
}

class _Card extends StatelessWidget {
  const _Card({required this.padding, required this.child});
  final double padding;
  final Widget child;

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
      child: child);
}
