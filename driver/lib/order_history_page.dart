import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

import 'app/route_names.dart';
import 'core/api/driver_api_client.dart';
import 'core/layout/driver_page_shell.dart';
import 'core/navigation/driver_navigation.dart';

import 'package:driver_web/core/tokens/driver_tokens.dart';

class OrderHistoryPage extends StatefulWidget {
  const OrderHistoryPage({super.key});

  @override
  State<OrderHistoryPage> createState() => _OrderHistoryPageState();
}

class _OrderHistoryPageState extends State<OrderHistoryPage> {
  final int _selectedTab = 0;
  int _selectedHistoryTab = 0;
  final _api = DriverApiClient.instance;
  List<Map<String, dynamic>> _trips = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadTrips();
  }

  List<Map<String, dynamic>> get _visibleTrips {
    if (_selectedHistoryTab == 0) return _trips;
    final settled = _selectedHistoryTab == 1;
    return _trips
        .where((trip) => (trip['settlement'] != null) == settled)
        .toList();
  }

  Map<String, List<Map<String, dynamic>>> get _tripsByDate {
    final groups = <String, List<Map<String, dynamic>>>{};
    for (final trip in _visibleTrips) {
      final date = DateTime.tryParse(trip['completedAt']?.toString() ??
          trip['scheduledAt']?.toString() ??
          '');
      final key = date == null ? '日期待確認' : _formatDateGroup(date);
      groups.putIfAbsent(key, () => []).add(trip);
    }
    return groups;
  }

  String _formatDateGroup(DateTime date) =>
      '${date.year}年${date.month}月${date.day}日';

  String _formatDateTime(DateTime date) {
    final local = date.toLocal();
    String two(int number) => number.toString().padLeft(2, '0');
    return '${local.year}/${two(local.month)}/${two(local.day)} '
        '${two(local.hour)}:${two(local.minute)}';
  }

  String _formatPrice(dynamic price, dynamic currency) {
    if (price is! num) return '待確認';
    final code = currency?.toString();
    final symbol = code == 'HKD'
        ? 'HK\$'
        : code == 'RMB' || code == 'CNY'
            ? '¥'
            : code == null || code.isEmpty
                ? ''
                : '$code ';
    return '$symbol${price.toStringAsFixed(2)}';
  }

  Future<void> _loadTrips() async {
    try {
      final trips = await _api.trips();
      if (mounted) {
        setState(() {
          _trips = trips
              .where((trip) => trip is Map && trip['completedAt'] != null)
              .map((trip) => Map<String, dynamic>.from(trip as Map))
              .toList();
          _loading = false;
        });
      }
    } on DriverApiException catch (error) {
      if (mounted) {
        setState(() {
          _error = error.message;
          _loading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return DriverPageShell(
      selectedIndex: _selectedTab,
      bottomPadding: 140,
      onHomeTap: () => DriverNavigation.replace(context, DriverRouteNames.home),
      onOrderTap: () =>
          DriverNavigation.replace(context, DriverRouteNames.orders),
      onProfileTap: () =>
          DriverNavigation.replace(context, DriverRouteNames.profile),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _Header(onBack: () => Navigator.of(context).pop()),
          const SizedBox(height: DriverSpacing.lg),
          _HistoryTabs(
            selectedIndex: _selectedHistoryTab,
            onChanged: (index) => setState(() => _selectedHistoryTab = index),
          ),
          const SizedBox(height: DriverSpacing.lg),
          if (_loading)
            const Center(
              child: Padding(
                padding: EdgeInsets.symmetric(vertical: DriverSpacing.xl),
                child: CircularProgressIndicator(),
              ),
            )
          else if (_error != null)
            Center(
                child: Padding(
              padding: EdgeInsets.symmetric(vertical: DriverSpacing.xl),
              child: Text(_error!),
            ))
          else if (_visibleTrips.isEmpty)
            const Center(
              child: Padding(
                padding: EdgeInsets.symmetric(vertical: DriverSpacing.xl),
                child: Text('暫無接單紀錄'),
              ),
            )
          else
            ..._tripsByDate.entries.expand((group) => [
                  Padding(
                    padding: const EdgeInsets.only(bottom: DriverSpacing.sm),
                    child: Text(group.key,
                        style: const TextStyle(
                            fontSize: DriverTypography.body,
                            fontWeight: FontWeight.w700,
                            color: DriverColors.secondaryText)),
                  ),
                  ...group.value.map((item) {
                    final date = DateTime.tryParse(
                        item['completedAt']?.toString() ??
                            item['scheduledAt']?.toString() ??
                            '');
                    final entry = _HistoryEntry(
                        date: date == null ? '日期待確認' : _formatDateTime(date),
                        price: _formatPrice(item['price'], item['currency']),
                        origin: item['pickupAddress']?.toString() ?? '起點待確認',
                        destination:
                            item['dropoffAddress']?.toString() ?? '終點待確認',
                        passenger: item['user']?['name']?.toString() ??
                            item['passengerName']?.toString() ??
                            '乘客',
                        settled: item['settlement'] != null,
                        settlementMethod:
                            item['settlement']?['method']?.toString() ?? '未設定');
                    return Padding(
                        padding:
                            const EdgeInsets.only(bottom: DriverSpacing.md),
                        child: _HistoryCard(
                          entry: entry,
                          onTap: () => DriverNavigation.push(
                            context,
                            DriverRouteNames.completedOrderDetail,
                            arguments: item['id']?.toString(),
                          ),
                        ));
                  }),
                  const SizedBox(height: DriverSpacing.sm),
                ]),
        ],
      ),
    );
  }
}

class _Header extends StatelessWidget {
  const _Header({required this.onBack});
  final VoidCallback onBack;

  @override
  Widget build(BuildContext context) => Row(
        children: [
          Material(
            color: DriverColors.surface,
            borderRadius: BorderRadius.circular(18),
            child: InkWell(
              onTap: onBack,
              borderRadius: BorderRadius.circular(18),
              child: Container(
                width: 36,
                height: 36,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                    border: Border.all(color: DriverColors.border),
                    borderRadius: BorderRadius.circular(18)),
                child: const Text('‹',
                    style: TextStyle(
                        fontSize: 24,
                        height: 1,
                        fontWeight: FontWeight.w700,
                        color: DriverColors.text)),
              ),
            ),
          ),
          const SizedBox(width: DriverSpacing.lg),
          const Text('接單紀錄',
              style: TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.w700,
                  color: DriverColors.text)),
        ],
      );
}

class _HistoryTabs extends StatelessWidget {
  const _HistoryTabs({required this.selectedIndex, required this.onChanged});
  final int selectedIndex;
  final ValueChanged<int> onChanged;

  @override
  Widget build(BuildContext context) => Row(
        children: [
          _HistoryTab(
              label: '全部',
              selected: selectedIndex == 0,
              onTap: () => onChanged(0)),
          const SizedBox(width: DriverSpacing.md),
          _HistoryTab(
              label: '已結算',
              selected: selectedIndex == 1,
              onTap: () => onChanged(1)),
          const SizedBox(width: DriverSpacing.md),
          _HistoryTab(
              label: '未結算',
              selected: selectedIndex == 2,
              onTap: () => onChanged(2)),
        ],
      );
}

class _HistoryTab extends StatelessWidget {
  const _HistoryTab(
      {required this.label, required this.selected, required this.onTap});
  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Material(
        color: DriverColors.surface,
        borderRadius: BorderRadius.circular(DriverRadii.input),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(DriverRadii.input),
          child: Container(
            padding: const EdgeInsets.symmetric(
                horizontal: DriverSpacing.lg, vertical: DriverSpacing.md),
            decoration: BoxDecoration(
                border: Border.all(
                    color:
                        selected ? DriverColors.primary : DriverColors.border),
                borderRadius: BorderRadius.circular(DriverRadii.input)),
            child: Text(label,
                style: TextStyle(
                    fontSize: DriverTypography.body,
                    fontWeight: selected ? FontWeight.w700 : FontWeight.w400,
                    color: selected
                        ? DriverColors.primary
                        : DriverColors.secondaryText)),
          ),
        ),
      );
}

class _HistoryEntry {
  const _HistoryEntry(
      {required this.date,
      required this.price,
      required this.origin,
      required this.destination,
      required this.passenger,
      required this.settled,
      required this.settlementMethod});
  final String date;
  final String price;
  final String origin;
  final String destination;
  final String passenger;
  final bool settled;
  final String settlementMethod;
}

class _HistoryCard extends StatelessWidget {
  const _HistoryCard({required this.entry, required this.onTap});
  final _HistoryEntry entry;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Material(
        color: DriverColors.surface,
        borderRadius: BorderRadius.circular(DriverRadii.card),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(DriverRadii.card),
          child: Container(
            padding: const EdgeInsets.all(DriverSpacing.lg),
            decoration: BoxDecoration(
                border: Border.all(color: DriverColors.border),
                borderRadius: BorderRadius.circular(DriverRadii.card)),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Flexible(
                        child: Text('出發  ${entry.date}',
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                                fontSize: DriverTypography.label,
                                color: DriverColors.secondaryText))),
                    const SizedBox(width: DriverSpacing.sm),
                    Text(entry.price,
                        style: const TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.w700,
                            color: DriverColors.text)),
                  ],
                ),
                const SizedBox(height: DriverSpacing.md),
                _RouteRow(
                    asset: 'assets/order-history-origin.svg',
                    label: '出發：${entry.origin}'),
                const SizedBox(height: 2),
                _RouteRow(
                    asset: 'assets/order-history-destination.svg',
                    label: '目的：${entry.destination}'),
                const SizedBox(height: DriverSpacing.md),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Flexible(
                        child: Row(children: [
                      SvgPicture.asset('assets/order-history-destination.svg',
                          width: 8, height: 8),
                      const SizedBox(width: DriverSpacing.sm),
                      Flexible(
                          child: Text(entry.passenger,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                  fontSize: DriverTypography.label,
                                  color: DriverColors.secondaryText))),
                    ])),
                    const SizedBox(width: DriverSpacing.sm),
                    Align(
                      alignment: Alignment.centerRight,
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: DriverSpacing.sm, vertical: 2),
                        decoration: BoxDecoration(
                            color: entry.settled
                                ? DriverColors.successBackground
                                : DriverColors.warningBackground,
                            borderRadius: BorderRadius.circular(4)),
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            Text(entry.settled ? '已結算' : '未結算',
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                textAlign: TextAlign.end,
                                style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w700,
                                    color: entry.settled
                                        ? DriverColors.primary
                                        : DriverColors.secondaryText)),
                            Text('結算方式：${entry.settlementMethod}',
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                textAlign: TextAlign.end,
                                style: const TextStyle(
                                    fontSize: 10,
                                    color: DriverColors.secondaryText)),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      );
}

class _RouteRow extends StatelessWidget {
  const _RouteRow({required this.asset, required this.label});
  final String asset;
  final String label;

  @override
  Widget build(BuildContext context) => Row(
        children: [
          SvgPicture.asset(asset, width: 8, height: 8),
          const SizedBox(width: DriverSpacing.sm),
          Expanded(
              child: Text(label,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                      fontSize: DriverTypography.body,
                      fontWeight: FontWeight.w500,
                      color: DriverColors.text))),
        ],
      );
}
