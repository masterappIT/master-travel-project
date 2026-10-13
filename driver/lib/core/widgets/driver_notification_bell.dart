import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

import '../state/driver_language_preference.dart';
import '../state/driver_notification_inbox.dart';
import '../state/driver_order_alert_coordinator.dart';
import '../tokens/driver_tokens.dart';

/// Bell button shared by the home and profile headers, with an unread count.
class DriverNotificationBell extends StatefulWidget {
  const DriverNotificationBell({super.key, required this.onTap});

  final VoidCallback onTap;

  @override
  State<DriverNotificationBell> createState() => _DriverNotificationBellState();
}

class _DriverNotificationBellState extends State<DriverNotificationBell> {
  @override
  void initState() {
    super.initState();
    DriverOrderAlertCoordinator.notificationsChanged.addListener(_refresh);
    _refresh();
  }

  @override
  void dispose() {
    DriverOrderAlertCoordinator.notificationsChanged.removeListener(_refresh);
    super.dispose();
  }

  void _refresh() => unawaited(DriverNotificationInbox.refresh());

  @override
  Widget build(BuildContext context) {
    return Stack(
      clipBehavior: Clip.none,
      children: [
        Semantics(
          button: true,
          label: '通知',
          child: InkWell(
            onTap: widget.onTap,
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
        Positioned(
          top: -DriverSpacing.xs,
          right: -DriverSpacing.xs,
          child: IgnorePointer(
            child: ValueListenableBuilder<int>(
              valueListenable: DriverNotificationInbox.unreadCount,
              builder: (context, count, _) {
                if (count <= 0) return const SizedBox.shrink();
                return Semantics(
                  // Wording stays within the glyphs of the preloaded UI font layer.
                  label: driverText('新通知 $count', '新通知 $count', '$count new'),
                  excludeSemantics: true,
                  child: Container(
                    constraints:
                        const BoxConstraints(minWidth: 18, minHeight: 18),
                    padding: const EdgeInsets.symmetric(
                        horizontal: DriverSpacing.xs),
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                        color: DriverColors.primary,
                        borderRadius: BorderRadius.circular(DriverRadii.pill)),
                    child: Text(count > 99 ? '99+' : '$count',
                        style: const TextStyle(
                            height: 1,
                            fontSize: DriverTypography.caption,
                            fontWeight: FontWeight.w700,
                            color: DriverColors.onPrimary)),
                  ),
                );
              },
            ),
          ),
        ),
      ],
    );
  }
}
