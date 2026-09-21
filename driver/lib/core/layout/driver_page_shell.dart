import 'package:flutter/material.dart';

import '../../floating_nav_bar.dart';
import '../tokens/driver_tokens.dart';

class DriverPageShell extends StatefulWidget {
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
  State<DriverPageShell> createState() => _DriverPageShellState();
}

class _DriverPageShellState extends State<DriverPageShell> {
  final ScrollController _scrollController = ScrollController();

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final bottomSafeInset = MediaQuery.viewPaddingOf(context).bottom;

    return Scaffold(
      backgroundColor: DriverColors.background,
      body: SafeArea(
        bottom: false,
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
                      controller: _scrollController,
                      primary: false,
                      physics: const BouncingScrollPhysics(
                        parent: AlwaysScrollableScrollPhysics(),
                      ),
                      keyboardDismissBehavior:
                          ScrollViewKeyboardDismissBehavior.onDrag,
                      padding: EdgeInsets.fromLTRB(
                        widget.horizontalPadding,
                        widget.topPadding,
                        widget.horizontalPadding,
                        widget.bottomPadding + bottomSafeInset,
                      ),
                      child: widget.child,
                    ),
                    if (widget.showBottomNavigation)
                      Positioned(
                        left: widget.navHorizontalPadding,
                        right: widget.navHorizontalPadding,
                        bottom:
                            DriverDimensions.navBottomInset + bottomSafeInset,
                        child: FloatingNavBar(
                          selectedIndex: widget.selectedIndex,
                          onHomeTap: widget.onHomeTap,
                          onOrderTap: widget.onOrderTap,
                          onProfileTap: widget.onProfileTap,
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
