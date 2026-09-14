import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

import 'core/layout/driver_page_shell.dart';
import 'home_page.dart';
import 'order_hall_page.dart';
import 'profile_page.dart';

class OrderHistoryPage extends StatefulWidget {
  const OrderHistoryPage({super.key});

  @override
  State<OrderHistoryPage> createState() => _OrderHistoryPageState();
}

class _OrderHistoryPageState extends State<OrderHistoryPage> {
  final int _selectedTab = 0;
  int _selectedHistoryTab = 0;

  @override
  Widget build(BuildContext context) {
    return DriverPageShell(
      selectedIndex: _selectedTab,
      bottomPadding: 140,
      onHomeTap: () => Navigator.of(context).pushReplacement(
          MaterialPageRoute<void>(builder: (_) => const HomePage())),
      onOrderTap: () => Navigator.of(context).pushReplacement(
          MaterialPageRoute<void>(builder: (_) => OrderHallPage())),
      onProfileTap: () => Navigator.of(context).pushReplacement(
          MaterialPageRoute<void>(builder: (_) => const ProfilePage())),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _Header(onBack: () => Navigator.of(context).pop()),
          const SizedBox(height: 16),
          _HistoryTabs(
            selectedIndex: _selectedHistoryTab,
            onChanged: (index) => setState(() => _selectedHistoryTab = index),
          ),
          const SizedBox(height: 16),
          const Text('2024年3月',
              style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w700,
                  color: Color(0xff56657e))),
          const SizedBox(height: 8),
          ..._historyEntries.map((entry) => Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: _HistoryCard(entry: entry),
              )),
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
            color: Colors.white,
            borderRadius: BorderRadius.circular(18),
            child: InkWell(
              onTap: onBack,
              borderRadius: BorderRadius.circular(18),
              child: Container(
                width: 36,
                height: 36,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                    border: Border.all(color: const Color(0xffd9d9d9)),
                    borderRadius: BorderRadius.circular(18)),
                child: const Text('‹',
                    style: TextStyle(
                        fontSize: 24,
                        height: 1,
                        fontWeight: FontWeight.w700,
                        color: Color(0xff1c1c2e))),
              ),
            ),
          ),
          const SizedBox(width: 16),
          const Text('接單紀錄',
              style: TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.w700,
                  color: Color(0xff1c1c2e))),
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
              label: '已結算',
              selected: selectedIndex == 0,
              onTap: () => onChanged(0)),
          const SizedBox(width: 12),
          _HistoryTab(
              label: '未結算',
              selected: selectedIndex == 1,
              onTap: () => onChanged(1)),
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
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(12),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
                border: Border.all(
                    color: selected
                        ? const Color(0xff4a6cf7)
                        : const Color(0xffd9d9d9)),
                borderRadius: BorderRadius.circular(12)),
            child: Text(label,
                style: TextStyle(
                    fontSize: 14,
                    fontWeight: selected ? FontWeight.w700 : FontWeight.w400,
                    color: selected
                        ? const Color(0xff4a6cf7)
                        : const Color(0xff56657e))),
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
      required this.settled});
  final String date;
  final String price;
  final String origin;
  final String destination;
  final String passenger;
  final bool settled;
}

const _historyEntries = [
  _HistoryEntry(
      date: '2024/03/15 14:00',
      price: '\$280.00',
      origin: '香港中環',
      destination: '深圳',
      passenger: '陳大文',
      settled: true),
  _HistoryEntry(
      date: '2024/03/12 09:30',
      price: '\$420.00',
      origin: '香港機場',
      destination: '珠海',
      passenger: '王小姐',
      settled: true),
  _HistoryEntry(
      date: '2024/03/08 11:15',
      price: '\$550.00',
      origin: '尖沙咀',
      destination: '廣州',
      passenger: '張先生',
      settled: false),
  _HistoryEntry(
      date: '2024/03/02 16:45',
      price: '\$680.00',
      origin: '銅鑼灣',
      destination: '澳門',
      passenger: '劉先生',
      settled: false),
];

class _HistoryCard extends StatelessWidget {
  const _HistoryCard({required this.entry});
  final _HistoryEntry entry;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
            color: Colors.white,
            border: Border.all(color: const Color(0xffd9d9d9)),
            borderRadius: BorderRadius.circular(16)),
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
                            fontSize: 13, color: Color(0xff56657e)))),
                const SizedBox(width: 8),
                Text(entry.price,
                    style: const TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.w700,
                        color: Color(0xff1c1c2e))),
              ],
            ),
            const SizedBox(height: 12),
            _RouteRow(
                asset: 'assets/order-history-origin.svg',
                label: '出發：${entry.origin}'),
            const SizedBox(height: 2),
            _RouteRow(
                asset: 'assets/order-history-destination.svg',
                label: '目的：${entry.destination}'),
            const SizedBox(height: 12),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Flexible(
                    child: Row(children: [
                  SvgPicture.asset('assets/order-history-destination.svg',
                      width: 8, height: 8),
                  const SizedBox(width: 8),
                  Flexible(
                      child: Text(entry.passenger,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                              fontSize: 13, color: Color(0xff56657e)))),
                ])),
                const SizedBox(width: 8),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(
                      color: entry.settled
                          ? const Color(0xffebf9f1)
                          : const Color(0xfffff4e5),
                      borderRadius: BorderRadius.circular(4)),
                  child: Text(entry.settled ? '已結算' : '未結算',
                      style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          color: entry.settled
                              ? const Color(0xff2b7a42)
                              : const Color(0xffb7791f))),
                ),
              ],
            ),
          ],
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
          const SizedBox(width: 8),
          Expanded(
              child: Text(label,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                      color: Color(0xff1c1c2e)))),
        ],
      );
}
