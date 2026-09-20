// ignore_for_file: avoid_web_libraries_in_flutter, deprecated_member_use

import 'dart:html' as html;
import 'dart:js' as js;

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
  void initState() {
    super.initState();
    _scrollController.addListener(_syncSafariScrollBridge);
  }

  void _syncSafariScrollBridge() {
    if (!html.document.documentElement!.classes.contains('safari-scroll')) {
      return;
    }
    final offset = _scrollController.hasClients
        ? _scrollController.offset.clamp(0.0, double.infinity)
        : 0.0;
    js.context.callMethod('updateSafariScrollBridge', <Object>[offset]);
  }

  @override
  void dispose() {
    _scrollController
      ..removeListener(_syncSafariScrollBridge)
      ..dispose();
    super.dispose();
  }

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
                        widget.bottomPadding,
                      ),
                      child: widget.child,
                    ),
                    if (widget.showBottomNavigation)
                      Positioned(
                        left: widget.navHorizontalPadding,
                        right: widget.navHorizontalPadding,
                        bottom: DriverDimensions.navBottomInset,
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
