import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'app/route_names.dart';
import 'core/layout/driver_page_shell.dart';
import 'core/navigation/driver_navigation.dart';

import 'package:driver_web/core/tokens/driver_tokens.dart';

class OrderHallPage extends StatefulWidget {
  const OrderHallPage({super.key});

  @override
  State<OrderHallPage> createState() => _OrderHallPageState();
}

class _OrderHallPageState extends State<OrderHallPage> {
  int _selectedTab = 0;

  void _openOrderDetail() {
    DriverNavigation.push(context, DriverRouteNames.orderDetail);
  }

  @override
  Widget build(BuildContext context) {
    return DriverPageShell(
      selectedIndex: 1,
      bottomPadding: 104,
      onHomeTap: () => DriverNavigation.replace(context, DriverRouteNames.home),
      onProfileTap: () =>
          DriverNavigation.replace(context, DriverRouteNames.profile),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: const [
                Text('接單大廳',
                    style: TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.w700,
                        color: DriverColors.text)),
                _OnlineBadge()
              ]),
          const SizedBox(height: DriverSpacing.xl),
          _OrderTabs(
              selectedIndex: _selectedTab,
              onChanged: (index) => setState(() => _selectedTab = index)),
          const SizedBox(height: DriverSpacing.md),
          if (_selectedTab == 0) ...[
            _OrderCard(
                passenger: '陳大文',
                time: '2024/03/15 14:00',
                price: '\$280.00',
                origin: '香港中環置地廣場東門大堂',
                destination: '深圳福田口岸',
                estimatedTime: '預估 18 分鐘',
                onTap: _openOrderDetail),
            const SizedBox(height: DriverSpacing.md),
            _OrderCard(
                passenger: '王小姐',
                time: '2024/03/15 15:30',
                price: '\$420.00',
                origin: '香港機場',
                destination: '珠海',
                estimatedTime: '預估 38 分鐘',
                onTap: _openOrderDetail),
          ] else
            const _EmptyAcceptedOrders(),
        ],
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
            color: DriverColors.activeBlue,
            borderRadius: BorderRadius.circular(DriverRadii.pill)),
        child: const Text('線上接單中',
            style: TextStyle(
                fontSize: DriverTypography.caption,
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
            borderRadius: BorderRadius.circular(DriverRadii.input),
            onTap: onTap,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              decoration: BoxDecoration(
                color: Colors.white,
                border: Border.all(
                    color:
                        selected ? DriverColors.primary : DriverColors.border),
                borderRadius: BorderRadius.circular(DriverRadii.input),
              ),
              child: Text(label,
                  style: TextStyle(
                      fontSize: DriverTypography.body,
                      fontWeight: selected ? FontWeight.w700 : FontWeight.w400,
                      color: selected
                          ? DriverColors.primary
                          : DriverColors.secondaryText)),
            ),
          ),
        ),
      );
}

class _OrderCard extends StatelessWidget {
  const _OrderCard(
      {required this.passenger,
      required this.time,
      required this.price,
      required this.origin,
      required this.destination,
      required this.estimatedTime,
      required this.onTap});
  final String passenger;
  final String time;
  final String price;
  final String origin;
  final String destination;
  final String estimatedTime;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(DriverRadii.card),
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            border: Border.all(color: DriverColors.divider),
            borderRadius: BorderRadius.circular(DriverRadii.card),
            boxShadow: const [
              BoxShadow(
                  color: Color(0x0a000000), blurRadius: 4, offset: Offset(0, 2))
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Flexible(
                    child: Text('出發  $time',
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                            fontSize: DriverTypography.body,
                            fontWeight: FontWeight.w500,
                            color: DriverColors.text)),
                  ),
                  const SizedBox(width: DriverSpacing.md),
                  Text(price,
                      style: const TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.w700,
                          color: DriverColors.success)),
                ],
              ),
              const SizedBox(height: DriverSpacing.md),
              Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  _RouteRow(asset: 'assets/route-origin.svg', label: origin),
                  const SizedBox(height: 2),
                  _RouteRow(
                      asset: 'assets/route-destination.svg',
                      label: destination),
                ],
              ),
              const SizedBox(height: DriverSpacing.md),
              const Divider(height: 1, color: DriverColors.divider),
              const SizedBox(height: DriverSpacing.md),
              Row(
                children: [
                  SvgPicture.asset('assets/route-driver.svg',
                      width: 8, height: 8),
                  const SizedBox(width: DriverSpacing.sm),
                  Expanded(
                    child: Text(passenger,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                            fontSize: DriverTypography.body,
                            color: DriverColors.secondaryText)),
                  ),
                ],
              ),
              const SizedBox(height: DriverSpacing.md),
              SizedBox(
                height: 48,
                child: ElevatedButton(
                  onPressed: onTap,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: DriverColors.activeBlue,
                    foregroundColor: Colors.white,
                    elevation: 0,
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(DriverRadii.card)),
                    padding: const EdgeInsets.symmetric(
                        horizontal: 16, vertical: 12),
                  ),
                  child: const Text('接單',
                      style: TextStyle(
                          fontSize: DriverTypography.body,
                          fontWeight: FontWeight.w700)),
                ),
              ),
            ],
          ),
        ),
      );
}

class _RouteRow extends StatelessWidget {
  const _RouteRow({required this.asset, required this.label});
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
                    fontSize: DriverTypography.body,
                    fontWeight: FontWeight.w500,
                    color: DriverColors.text))),
      ]);
}

class _EmptyAcceptedOrders extends StatelessWidget {
  const _EmptyAcceptedOrders();

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
            color: Colors.white,
            border: Border.all(color: DriverColors.divider),
            borderRadius: BorderRadius.circular(DriverRadii.card)),
        child: const Text('暫無成功接單',
            textAlign: TextAlign.center,
            style: TextStyle(
                fontSize: DriverTypography.body,
                color: DriverColors.secondaryText)),
      );
}
