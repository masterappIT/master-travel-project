import 'package:flutter/material.dart';
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
  Widget build(BuildContext context) => Material(
        color: Colors.white,
        elevation: 8,
        shadowColor: const Color(0x1a000000),
        borderRadius: BorderRadius.circular(30),
        child: SizedBox(
          height: 60,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _NavItem(
                    label: '首頁',
                    asset: 'assets/icon-home.svg',
                    selected: selectedIndex == 0,
                    onTap: onHomeTap),
                _NavItem(
                    label: '接單',
                    selected: selectedIndex == 1,
                    onTap: onOrderTap),
                _NavItem(
                    label: '我的',
                    asset: 'assets/icon-person.svg',
                    selected: selectedIndex == 2,
                    onTap: onProfileTap),
              ],
            ),
          ),
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
                                    ? const Color(0xff295cfc)
                                    : const Color(0xff9999a1),
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
                            ? const Color(0xff295cfc)
                            : const Color(0xff9999a1))),
              ],
            ),
          ),
        ),
      );
}
