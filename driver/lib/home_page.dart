import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

import 'app/route_names.dart';
import 'core/api/driver_api_client.dart';
import 'core/layout/driver_page_shell.dart';
import 'core/navigation/driver_navigation.dart';
import 'core/state/driver_status.dart';

import 'package:driver_web/core/tokens/driver_tokens.dart';

String _formatMoney(dynamic value, dynamic currency) {
  if (value is! num) return '—';
  final code = currency?.toString();
  final symbol = code == 'HKD'
      ? 'HK\$'
      : code == 'RMB' || code == 'CNY'
          ? '¥'
          : code == null || code.isEmpty
              ? ''
              : '$code ';
  return '$symbol${value.toStringAsFixed(2)}';
}

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
  Map<String, dynamic>? _statistics;
  bool _statsLoading = true;
  String? _statsError;

  @override
  void initState() {
    super.initState();
    _loadDriver();
    _loadStatistics();
  }

  Future<void> _loadStatistics() async {
    try {
      final result = await _api.statistics();
      if (mounted)
        setState(() {
          _statistics = result;
          _statsLoading = false;
        });
    } on DriverApiException catch (error) {
      if (mounted)
        setState(() {
          _statsError = error.message;
          _statsLoading = false;
        });
    }
  }

  Future<void> _loadDriver() async {
    try {
      final result = await _api.me();
      if (!mounted) return;
      final driver = Map<String, dynamic>.from(
          result['driver'] is Map ? result['driver'] as Map : result);
      setState(() {
        _driver = driver;
        _isOnline = driver['isOnline'] == true;
        DriverStatusController.instance.isOnline.value = _isOnline;
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

  Future<void> _showNotifications() async {
    try {
      final items = await _api.notifications();
      if (!mounted) return;
      await showModalBottomSheet<void>(
        context: context,
        builder: (context) => SafeArea(
          child: ListView(
            shrinkWrap: true,
            padding: const EdgeInsets.all(24),
            children: [
              const Text('通知',
                  style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700)),
              const SizedBox(height: 12),
              if (items.isEmpty) const Text('目前沒有通知'),
              ...items.map((item) {
                final notification = Map<String, dynamic>.from(item as Map);
                final id = notification['id']?.toString();
                return ListTile(
                  title: Text(notification['title']?.toString() ?? '通知'),
                  subtitle: Text(notification['message']?.toString() ?? ''),
                  onTap: id == null
                      ? null
                      : () async {
                          await _api.readNotification(id);
                          if (context.mounted) Navigator.of(context).pop();
                        },
                );
              }),
            ],
          ),
        ),
      );
    } on DriverApiException catch (error) {
      if (mounted)
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(error.message)));
    }
  }

  Future<void> _toggleOnline(bool value) async {
    final previous = _isOnline;
    setState(() => _isOnline = value);
    DriverStatusController.instance.isOnline.value = value;
    try {
      final result = await _api.updateStatus(value);
      if (mounted) setState(() => _driver = Map<String, dynamic>.from(result));
    } on DriverApiException catch (error) {
      if (mounted) {
        setState(() {
          _isOnline = previous;
          DriverStatusController.instance.isOnline.value = previous;
          _error = error.message;
        });
      }
    }
  }

  String _vehicleSummary(Map<String, dynamic>? driver) {
    final plateType = driver?['plateType']?.toString().trim();
    final category = driver?['vehicleCategory']?.toString().trim();
    return [
      '香港',
      if (plateType != null && plateType.isNotEmpty) plateType,
      if (category != null && category.isNotEmpty) category,
    ].join(' · ');
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
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Container(
            padding: const EdgeInsets.fromLTRB(20, 20, 20, 18),
            decoration: BoxDecoration(
              color: DriverColors.panelTint,
              borderRadius: BorderRadius.circular(DriverRadii.card),
              border: Border.all(color: DriverColors.infoBackground),
            ),
            child: _ProfileHeader(
              name: (_driver?['name'] as String?) ?? (_loading ? '載入中…' : '司機'),
              vehicleSummary: _vehicleSummary(_driver),
              onNotificationTap: _showNotifications,
            ),
          ),
          if (_error != null) ...[
            const SizedBox(height: DriverSpacing.sm),
            Text(_error!,
                style: const TextStyle(color: DriverColors.warningText)),
          ],
          const SizedBox(height: DriverSpacing.xl),
          const _SectionEyebrow('工作台總覽'),
          const SizedBox(height: DriverSpacing.sm),
          _StatusCard(
            isOnline: _isOnline,
            onChanged: _toggleOnline,
          ),
          const SizedBox(height: DriverSpacing.xl),
          const _SectionEyebrow('收入與表現'),
          const SizedBox(height: DriverSpacing.sm),
          _EarningsCard(
              statistics: _statistics,
              loading: _statsLoading,
              error: _statsError),
          const SizedBox(height: DriverSpacing.lg),
          _QuickStatsRow(
              statistics: _statistics,
              loading: _statsLoading,
              error: _statsError),
          const SizedBox(height: DriverSpacing.xl),
          _RecentOrdersSection(
              orders: (_statistics?['recentOrders'] as List?)
                      ?.map((item) => Map<String, dynamic>.from(item as Map))
                      .toList() ??
                  const [],
              loading: _statsLoading,
              error: _statsError,
              onViewAll: () => DriverNavigation.push(
                  context, DriverRouteNames.orderHistory)),
        ],
      ),
    );
  }
}

class _ProfileHeader extends StatelessWidget {
  const _ProfileHeader(
      {required this.name,
      required this.vehicleSummary,
      required this.onNotificationTap});
  final String name;
  final String vehicleSummary;
  final VoidCallback onNotificationTap;

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
                Text(vehicleSummary,
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
                    color: DriverColors.surface,
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
          padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
          decoration: BoxDecoration(
            color:
                isOnline ? DriverColors.infoBackground : DriverColors.surface,
            border: Border.all(
                color: isOnline ? DriverColors.primary : DriverColors.divider),
            borderRadius: BorderRadius.circular(DriverRadii.card),
            boxShadow: DriverShadows.card,
          ),
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
                child: Switch(
                  value: isOnline,
                  onChanged: onChanged,
                  activeColor: DriverColors.onPrimary,
                  activeTrackColor: DriverColors.primary,
                  inactiveThumbColor: DriverColors.mutedText,
                  inactiveTrackColor: DriverColors.divider,
                  trackOutlineColor:
                      WidgetStateProperty.all(DriverColors.border),
                ),
              ),
            ],
          ),
        ),
      );
}

class _SectionEyebrow extends StatelessWidget {
  const _SectionEyebrow(this.label);

  final String label;

  @override
  Widget build(BuildContext context) => Text(label,
      style: const TextStyle(
          fontSize: DriverTypography.label,
          fontWeight: FontWeight.w700,
          letterSpacing: 0.4,
          color: DriverColors.secondaryText));
}

class _EarningsCard extends StatelessWidget {
  const _EarningsCard(
      {required this.statistics, required this.loading, this.error});
  final Map<String, dynamic>? statistics;
  final bool loading;
  final String? error;

  String _number(dynamic value) => value is num ? value.toString() : '—';

  @override
  Widget build(BuildContext context) {
    final today = statistics?['today'] as Map<String, dynamic>?;
    return _Card(
        padding: 20,
        child: loading
            ? const SizedBox(
                height: 150, child: Center(child: CircularProgressIndicator()))
            : error != null
                ? Text(error!,
                    style: const TextStyle(color: DriverColors.primary))
                : Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('今日收入',
                          style: TextStyle(
                              fontSize: DriverTypography.body,
                              color: DriverColors.secondaryText)),
                      const SizedBox(height: DriverSpacing.xs),
                      Text(_formatMoney(today?['earnings'], today?['currency']),
                          style: const TextStyle(
                              fontSize: 36,
                              fontWeight: FontWeight.w800,
                              color: DriverColors.text)),
                      const SizedBox(height: DriverSpacing.lg),
                      SvgPicture.asset('assets/home-divider.svg',
                          width: double.infinity, height: 1),
                      const SizedBox(height: DriverSpacing.lg),
                      Row(children: [
                        Expanded(
                            child: _Stat(
                                label: '今日接單',
                                value:
                                    '${_number(today?['completedTrips'])} 單')),
                        Expanded(
                            child: _Stat(
                                label: '在線時數',
                                value: today?['onlineHours'] is num
                                    ? '${(today!['onlineHours'] as num).toStringAsFixed(1)} 小時'
                                    : '—')),
                      ]),
                    ],
                  ));
  }
}

class _QuickStatsRow extends StatelessWidget {
  const _QuickStatsRow(
      {required this.statistics, required this.loading, this.error});
  final Map<String, dynamic>? statistics;
  final bool loading;
  final String? error;

  @override
  Widget build(BuildContext context) {
    final month = statistics?['month'] as Map<String, dynamic>?;
    final rating = statistics?['rating'] as Map<String, dynamic>?;
    final monthValue = _formatMoney(month?['earnings'], month?['currency']);
    final ratingValue = rating?['average'] is num
        ? '${(rating!['average'] as num).toStringAsFixed(1)} / 5.0'
        : '尚無評分';
    if (loading)
      return const Row(children: [
        Expanded(
            child: _Card(
                padding: 16,
                child: Center(child: CircularProgressIndicator()))),
        SizedBox(width: 16),
        Expanded(
            child: _Card(
                padding: 16, child: Center(child: CircularProgressIndicator())))
      ]);
    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Expanded(
              child: _Card(
                  padding: 16,
                  child: _Stat(
                      label: '本月收入',
                      value: error == null ? monthValue : '—',
                      valueSize: 20))),
          const SizedBox(width: 16),
          Expanded(
              child: _Card(
                  padding: 16,
                  child:
                      _RatingStat(value: error == null ? ratingValue : '—'))),
        ],
      ),
    );
  }
}

class _RecentOrdersSection extends StatelessWidget {
  const _RecentOrdersSection(
      {required this.orders,
      required this.loading,
      required this.onViewAll,
      this.error});
  final List<Map<String, dynamic>> orders;
  final bool loading;
  final String? error;
  final VoidCallback onViewAll;

  String _formatCompletedAt(dynamic value) {
    final date = DateTime.tryParse(value?.toString() ?? '')?.toLocal();
    if (date == null) return '—';
    String two(int number) => number.toString().padLeft(2, '0');
    return '${date.year}/${two(date.month)}/${two(date.day)} '
        '${two(date.hour)}:${two(date.minute)}';
  }

  @override
  Widget build(BuildContext context) {
    if (loading) return const Center(child: CircularProgressIndicator());
    if (error != null) return Text(error!);
    if (orders.isEmpty) return const _Card(padding: 20, child: Text('暫無已完成訂單'));
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
          const Text('最近訂單',
              style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                  color: DriverColors.text)),
          TextButton(
            onPressed: onViewAll,
            child: const Text('查看全部',
                style: TextStyle(
                    fontSize: DriverTypography.body,
                    fontWeight: FontWeight.w500,
                    color: DriverColors.activeBlue)),
          ),
        ]),
        const SizedBox(height: 12),
        ...orders.map((order) => Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: _RecentOrderCard(
                time: _formatCompletedAt(order['completedAt']),
                price: order['price'] is num
                    ? '\$${(order['price'] as num).toStringAsFixed(2)}'
                    : '—',
                origin: order['origin']?.toString() ?? '—',
                destination: order['destination']?.toString() ?? '—',
                passenger: order['passenger']?.toString() ?? '—',
                settlementStatus:
                    order['settlementStatus'] == 'SETTLED' ? '已結算' : '未結算',
                settlementMethod:
                    order['settlementMethod']?.toString() ?? '未設定',
              ),
            )),
      ],
    );
  }
}

class _RecentOrderCard extends StatelessWidget {
  const _RecentOrderCard(
      {required this.time,
      required this.price,
      required this.origin,
      required this.destination,
      required this.passenger,
      required this.settlementStatus,
      required this.settlementMethod});
  final String time,
      price,
      origin,
      destination,
      passenger,
      settlementStatus,
      settlementMethod;

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
              child: Align(
                alignment: Alignment.centerRight,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(settlementStatus,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        textAlign: TextAlign.end,
                        style: TextStyle(
                            fontSize: DriverTypography.label,
                            fontWeight: FontWeight.w700,
                            color: settlementStatus == '已結算'
                                ? DriverColors.primary
                                : DriverColors.secondaryText)),
                    Text('結算方式：$settlementMethod',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        textAlign: TextAlign.end,
                        style: const TextStyle(
                            fontSize: DriverTypography.label,
                            color: DriverColors.secondaryText)),
                  ],
                ),
              ),
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
  const _RatingStat({required this.value});
  final String value;

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
            child: Text(value,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                    fontSize: DriverTypography.body,
                    fontWeight: FontWeight.w600,
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
        color: DriverColors.surface,
        border: Border.all(color: DriverColors.divider),
        borderRadius: BorderRadius.circular(DriverRadii.card),
        boxShadow: DriverShadows.card,
      ),
      child: child);
}
