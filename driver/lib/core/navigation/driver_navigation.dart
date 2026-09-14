import 'package:flutter/material.dart';

import '../../app/router.dart';
import '../../home_page.dart';
import '../../order_accepted_page.dart';
import '../../order_completed_page.dart';
import '../../order_detail_page.dart';
import '../../order_hall_page.dart';
import '../../order_history_page.dart';
import '../../order_in_progress_page.dart';
import '../../profile_page.dart';
import '../../registration_page.dart';

abstract final class DriverNavigation {
  static Future<void> push(BuildContext context, String route) {
    return Navigator.of(context).push(
      MaterialPageRoute<void>(builder: (_) => _pageFor(route)),
    );
  }

  static Future<void> replace(BuildContext context, String route) {
    return Navigator.of(context).pushReplacement(
      MaterialPageRoute<void>(builder: (_) => _pageFor(route)),
    );
  }

  static Future<void> replaceAll(BuildContext context, String route) {
    return Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute<void>(builder: (_) => _pageFor(route)),
      (_) => false,
    );
  }

  static Widget _pageFor(String route) => switch (route) {
        DriverRoutes.registration => const RegistrationPage(),
        DriverRoutes.home => const HomePage(),
        DriverRoutes.orders => const OrderHallPage(),
        DriverRoutes.orderDetail => const OrderDetailPage(),
        DriverRoutes.orderHistory => const OrderHistoryPage(),
        DriverRoutes.profile => const ProfilePage(),
        DriverRoutes.orderAccepted => const OrderAcceptedPage(),
        DriverRoutes.orderInProgress => const OrderInProgressPage(),
        DriverRoutes.orderCompleted => const OrderCompletedPage(),
        _ => const HomePage(),
      };
}
