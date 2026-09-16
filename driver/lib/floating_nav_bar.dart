import 'package:flutter/material.dart';

import 'core/tokens/driver_tokens.dart';
import 'package:flutter_svg/flutter_svg.dart';

class FloatingNavBar extends StatelessWidget {
  const FloatingNavBar(
      {super.key,
      required this.selectedIndex,
      this.onHomeTap,
      this.onOrderTap,
      this.onProfileTap});
  final int selectedIndex;
  final VoidCallback? onHomeTap;
  final VoidCallback? onOrderTap;
  final VoidCallback? onProfileTap;

  @override
  Widget build(BuildContext context) => Container(
        height: 76,
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: DriverColors.surface,
          borderRadius: BorderRadius.circular(DriverRadii.card),
          border: Border.all(color: DriverColors.divider),
          boxShadow: DriverShadows.floating,
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceAround,
          children: [
            _NavItem(
                label: '首頁',
                asset: 'assets/icon-home.svg',
                selected: selectedIndex == 0,
                onTap: onHomeTap),
            _NavItem(
                label: '接單', selected: selectedIndex == 1, onTap: onOrderTap),
            _NavItem(
                label: '我的',
                asset: 'assets/icon-person.svg',
                selected: selectedIndex == 2,
                onTap: onProfileTap),
          ],
        ),
      );
}

class _NavItem extends StatelessWidget {
  const _NavItem(
      {required this.label, this.asset, required this.selected, this.onTap});
  final String label;
  final String? asset;
  final bool selected;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) => Expanded(
        child: Semantics(
          button: true,
          selected: selected,
          label: label,
          child: InkWell(
            onTap: onTap,
            borderRadius: BorderRadius.circular(22),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color:
                    selected ? DriverColors.infoBackground : Colors.transparent,
                borderRadius: BorderRadius.circular(DriverRadii.input),
              ),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  SizedBox(
                    width: 22,
                    height: 22,
                    child: asset == null
                        ? Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: List.generate(
                              3,
                              (_) => Container(
                                margin: const EdgeInsets.symmetric(vertical: 2),
                                width: 15,
                                height: 2,
                                decoration: BoxDecoration(
                                  color: selected
                                      ? DriverColors.navActive
                                      : DriverColors.navInactive,
                                  borderRadius: BorderRadius.circular(1),
                                ),
                              ),
                            ),
                          )
                        : SvgPicture.asset(asset!, width: 22, height: 22),
                  ),
                  const SizedBox(height: 3),
                  Text(label,
                      style: TextStyle(
                          fontSize: 11,
                          fontWeight:
                              selected ? FontWeight.w700 : FontWeight.w400,
                          color: selected
                              ? DriverColors.navActive
                              : DriverColors.navInactive)),
                ],
              ),
            ),
          ),
        ),
      );
}
