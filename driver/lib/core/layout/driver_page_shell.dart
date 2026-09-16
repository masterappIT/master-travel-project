import 'package:flutter/material.dart';

import '../../floating_nav_bar.dart';
import '../tokens/driver_tokens.dart';

class DriverPageShell extends StatelessWidget {
  const DriverPageShell({
    super.key,
    required this.child,
    required this.selectedIndex,
    this.onHomeTap,
    this.onOrderTap,
    this.onProfileTap,
    this.topPadding = DriverDimensions.pageTopPadding,
    this.horizontalPadding = DriverDimensions.pageHorizontalPadding,
    this.navHorizontalPadding = DriverDimensions.navHorizontalPadding,
    this.bottomPadding = DriverDimensions.bottomNavigationPadding,
    this.showBottomNavigation = true,
  });
  final Widget child;
  final int selectedIndex;
  final VoidCallback? onHomeTap;
  final VoidCallback? onOrderTap;
  final VoidCallback? onProfileTap;
  final double bottomPadding;
  final double topPadding;
  final double horizontalPadding;
  final double navHorizontalPadding;
  final bool showBottomNavigation;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: DriverColors.background,
      body: SafeArea(
        child: Align(
          alignment: Alignment.topCenter,
          child: ConstrainedBox(
            constraints: const BoxConstraints(
              maxWidth: DriverDimensions.maxContentWidth,
            ),
            child: Container(
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [DriverColors.shellAccent, DriverColors.background],
                  stops: [0.0, 0.26],
                ),
              ),
              child: SizedBox.expand(
                child: Stack(
                  children: [
                    SingleChildScrollView(
                      padding: EdgeInsets.fromLTRB(
                        horizontalPadding,
                        topPadding,
                        horizontalPadding,
                        bottomPadding,
                      ),
                      child: child,
                    ),
                    if (showBottomNavigation)
                      Positioned(
                        left: navHorizontalPadding,
                        right: navHorizontalPadding,
                        bottom: DriverDimensions.navBottomInset,
                        child: FloatingNavBar(
                          selectedIndex: selectedIndex,
                          onHomeTap: onHomeTap,
                          onOrderTap: onOrderTap,
                          onProfileTap: onProfileTap,
                        ),
                      ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
