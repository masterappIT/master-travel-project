import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

import 'app/route_names.dart';
import 'core/api/driver_api_client.dart';
import 'core/layout/driver_page_shell.dart';
import 'core/navigation/driver_navigation.dart';

import 'package:driver_web/core/tokens/driver_tokens.dart';

class HomePage extends StatefulWidget {
  const HomePage({super.key});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  final _api = DriverApiClient.instance;
  bool _isOnline = false;
  bool _loading = true;
  String? _error;
  Map<String, dynamic>? _driver;

  @override
  void initState() {
    super.initState();
    _loadDriver();
  }

  Future<void> _loadDriver() async {
    try {
      final result = await _api.me();
      if (!mounted) return;
      final driver = Map<String, dynamic>.from(result);
      setState(() {
        _driver = driver;
        _isOnline = driver['isOnline'] == true;
        _loading = false;
      });
    } on DriverApiException catch (error) {
      if (mounted) {
        setState(() {
          _error = error.message;
          _loading = false;
        });
      }
    }
  }

  Future<void> _toggleOnline(bool value) async {
    final previous = _isOnline;
    setState(() => _isOnline = value);
    try {
      final result = await _api.updateStatus(value);
      if (mounted) setState(() => _driver = Map<String, dynamic>.from(result));
    } on DriverApiException catch (error) {
      if (mounted) {
        setState(() {
          _isOnline = previous;
          _error = error.message;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return DriverPageShell(
      selectedIndex: 0,
      topPadding: 12,
      bottomPadding: 120,
      onOrderTap: () => DriverNavigation.push(context, DriverRouteNames.orders),
      onProfileTap: () =>
          DriverNavigation.push(context, DriverRouteNames.profile),
      child: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(child: Text(_error!))
              : Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    _ProfileHeader(
                        name: (_driver?['name'] as String?) ?? '司機',
                        onNotificationTap: () => DriverNavigation.push(
                            context, DriverRouteNames.profile)),
                    const SizedBox(height: 20),
                    _StatusCard(
                      isOnline: _isOnline,
                      onChanged: _toggleOnline,
                    ),
                    const SizedBox(height: 20),
                    const _EarningsCard(),
                    const SizedBox(height: 20),
                    const _QuickStatsRow(),
                    const SizedBox(height: 20),
                    const _RecentOrdersSection(),
                  ],
                ),
    );
  }
}

class _ProfileHeader extends StatelessWidget {
  const _ProfileHeader({required this.name, required this.onNotificationTap});
  final String name;
  final VoidCallback onNotificationTap;

  @override
  Widget build(BuildContext context) => Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Flexible(
                      child: Text(name,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                              fontSize: 24,
                              fontWeight: FontWeight.w700,
                              color: DriverColors.text)),
                    ),
                    SizedBox(width: 8),
                    DecoratedBox(
                      decoration: BoxDecoration(
                          color: DriverColors.successBackground,
                          borderRadius: BorderRadius.all(Radius.circular(100))),
                      child: Padding(
                        padding:
                            EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                        child: Text('已認證司機',
                            style: TextStyle(
                                fontSize: DriverTypography.caption,
                                fontWeight: FontWeight.w700,
                                color: DriverColors.darkGreen)),
                      ),
                    ),
                  ],
                ),
                SizedBox(height: 4),
                Text('兩地牌 · 轎車',
                    style: TextStyle(
                        fontSize: DriverTypography.label,
                        color: DriverColors.secondaryText)),
              ],
            ),
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
                    border: Border.all(color: DriverColors.divider),
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
        borderRadius: BorderRadius.circular(DriverRadii.card),
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
              color: Colors.white,
              border: Border.all(color: DriverColors.divider),
              borderRadius: BorderRadius.circular(DriverRadii.card),
              boxShadow: const [
                BoxShadow(
                    color: Color(0x0a000000),
                    blurRadius: 4,
                    offset: Offset(0, 2))
              ]),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Flexible(
                child: Row(children: [
                  SvgPicture.asset('assets/home-status-dot.svg',
                      width: 12, height: 12),
                  const SizedBox(width: DriverSpacing.sm),
                  Flexible(
                    child: Text(isOnline ? '目前狀態：在線接單' : '目前狀態：離線',
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                            fontSize: DriverTypography.bodyLarge,
                            fontWeight: FontWeight.w700,
                            color: DriverColors.text)),
                  ),
                ]),
              ),
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
                style: TextStyle(
                    fontSize: DriverTypography.body,
                    color: DriverColors.secondaryText)),
            const SizedBox(height: DriverSpacing.xs),
            const Text('\$1,280.00',
                style: TextStyle(
                    fontSize: 36,
                    fontWeight: FontWeight.w800,
                    color: DriverColors.text)),
            const SizedBox(height: DriverSpacing.lg),
            SvgPicture.asset('assets/home-divider.svg',
                width: double.infinity, height: 1),
            const SizedBox(height: DriverSpacing.lg),
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
                    color: DriverColors.text)),
            Text('查看全部',
                style: TextStyle(
                    fontSize: DriverTypography.body,
                    fontWeight: FontWeight.w500,
                    color: DriverColors.activeBlue)),
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
                  style: const TextStyle(
                      fontSize: DriverTypography.body,
                      color: DriverColors.secondaryText)),
            ),
            const SizedBox(width: DriverSpacing.sm),
            Text(price,
                style: const TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.w700,
                    color: DriverColors.darkGreen)),
          ]),
          const SizedBox(height: DriverSpacing.md),
          _RouteRow(asset: 'assets/home-origin-dot.svg', text: origin),
          const SizedBox(height: DriverSpacing.sm),
          _RouteRow(
              asset: 'assets/home-destination-dot.svg', text: destination),
          const SizedBox(height: DriverSpacing.md),
          SvgPicture.asset('assets/home-order-divider.svg',
              width: double.infinity, height: 1),
          const SizedBox(height: DriverSpacing.md),
          Row(children: [
            Expanded(
              child: Row(children: [
                SvgPicture.asset('assets/home-user.svg', width: 14, height: 14),
                const SizedBox(width: 6),
                Flexible(
                  child: Text(passenger,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                          fontSize: DriverTypography.label,
                          color: DriverColors.secondaryText)),
                ),
              ]),
            ),
            const SizedBox(width: DriverSpacing.sm),
            Flexible(
              child: Text(distance,
                  overflow: TextOverflow.ellipsis,
                  textAlign: TextAlign.end,
                  style: const TextStyle(
                      fontSize: DriverTypography.label,
                      color: DriverColors.secondaryText)),
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
        const SizedBox(width: DriverSpacing.sm),
        Expanded(
            child: Text(text,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w500,
                    color: DriverColors.text)))
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
            style: const TextStyle(
                fontSize: DriverTypography.caption,
                color: DriverColors.secondaryText)),
        const SizedBox(height: 2),
        Text(value,
            style: TextStyle(
                fontSize: valueSize,
                fontWeight: FontWeight.w700,
                color: DriverColors.text))
      ]);
}

class _RatingStat extends StatelessWidget {
  const _RatingStat();

  @override
  Widget build(BuildContext context) =>
      Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Text('評分',
            style: TextStyle(
                fontSize: DriverTypography.label,
                color: DriverColors.secondaryText)),
        const SizedBox(height: DriverSpacing.xs),
        Row(children: [
          SvgPicture.asset('assets/home-star.svg', width: 16, height: 16),
          const SizedBox(width: DriverSpacing.xs),
          Flexible(
            child: Text('4.9 / 5.0',
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.w700,
                    color: DriverColors.text)),
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
          border: Border.all(color: DriverColors.divider),
          borderRadius: BorderRadius.circular(DriverRadii.card),
          boxShadow: const [
            BoxShadow(
                color: Color(0x0a000000), blurRadius: 4, offset: Offset(0, 2))
          ]),
      child: child);
}
