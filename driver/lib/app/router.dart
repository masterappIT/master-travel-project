import 'package:flutter/material.dart';

import '../auth/login_page.dart';
import '../home_page.dart';
import '../order_accepted_page.dart';
import '../order_completed_page.dart';
import '../order_detail_page.dart';
import '../order_hall_page.dart';
import '../order_history_page.dart';
import '../order_in_progress_page.dart';
import '../profile_page.dart';
import '../registration_page.dart';

abstract final class DriverRoutes {
  static const login = '/';
  static const registration = '/registration';
  static const home = '/home';
  static const orders = '/orders';
  static const orderDetail = '/orders/detail';
  static const orderHistory = '/orders/history';
  static const profile = '/profile';
  static const orderAccepted = '/orders/accepted';
  static const orderInProgress = '/orders/in-progress';
  static const orderCompleted = '/orders/completed';

  static Map<String, WidgetBuilder> get builders => {
        login: (_) => const LoginPage(),
        registration: (_) => const RegistrationPage(),
        home: (_) => const HomePage(),
        orders: (_) => const OrderHallPage(),
        orderHistory: (_) => const OrderHistoryPage(),
        profile: (_) => const ProfilePage(),
        orderDetail: (_) => const OrderDetailPage(),
        orderAccepted: (_) => const OrderAcceptedPage(),
        orderInProgress: (_) => const OrderInProgressPage(),
        orderCompleted: (_) => const OrderCompletedPage(),
      };
}
