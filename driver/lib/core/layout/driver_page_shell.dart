import 'dart:async';

import 'package:flutter/material.dart';

import '../../floating_nav_bar.dart';
import '../platform/safari_scroll_bridge_stub.dart'
    if (dart.library.html) '../platform/safari_scroll_bridge_web.dart';
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
  final SafariScrollBridge _safariScrollBridge = const SafariScrollBridge();
  StreamSubscription<Object?>? _windowScrollSubscription;

  @override
  void initState() {
    super.initState();
    if (_safariScrollBridge.isEnabled) {
      _windowScrollSubscription =
          _safariScrollBridge.listen(_syncDriverScrollFromSafari);
      WidgetsBinding.instance.addPostFrameCallback((_) {
        _syncSafariScrollExtent();
        _syncDriverScrollFromSafari(_safariScrollBridge.currentOffset);
      });
    }
  }

  void _syncDriverScrollFromSafari(double offset) {
    if (!_scrollController.hasClients) {
      return;
    }
    final target = offset.clamp(
      0.0,
      _scrollController.position.maxScrollExtent,
    );
    if ((_scrollController.offset - target).abs() < 1.0) {
      return;
    }
    _scrollController.jumpTo(target);
  }

  void _syncSafariScrollExtent() {
    if (!_safariScrollBridge.isEnabled || !_scrollController.hasClients) {
      return;
    }
    _safariScrollBridge.syncExtent(
      _scrollController.position.maxScrollExtent,
    );
  }

  @override
  void dispose() {
    _windowScrollSubscription?.cancel();
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
                    NotificationListener<ScrollNotification>(
                      onNotification: (notification) {
                        if (notification is ScrollMetricsNotification) {
                          WidgetsBinding.instance.addPostFrameCallback((_) {
                            _syncSafariScrollExtent();
                          });
                        }
                        return false;
                      },
                      child: SingleChildScrollView(
                        controller: _scrollController,
                        primary: false,
                        physics: _safariScrollBridge.isEnabled
                            ? const NeverScrollableScrollPhysics()
                            : const BouncingScrollPhysics(
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
