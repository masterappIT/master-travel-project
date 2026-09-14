import 'package:flutter/material.dart';

import '../add_vehicle_page.dart';
import '../auth/login_page.dart';
import '../driver_profile_page.dart';
import '../home_page.dart';
import '../order_accepted_page.dart';
import '../order_completed_page.dart';
import '../order_detail_page.dart';
import '../order_hall_page.dart';
import '../order_history_page.dart';
import '../order_in_progress_page.dart';
import '../profile_page.dart';
import '../registration_page.dart';
import '../vehicle_legacy_page.dart';
import '../vehicle_page.dart';
import 'route_names.dart';

abstract final class DriverRouter {
  static Map<String, WidgetBuilder> get builders => {
        DriverRouteNames.login: (_) => const LoginPage(),
        DriverRouteNames.registration: (_) => const RegistrationPage(),
        DriverRouteNames.home: (_) => const HomePage(),
        DriverRouteNames.orders: (_) => const OrderHallPage(),
        DriverRouteNames.profile: (_) => const ProfilePage(),
        DriverRouteNames.orderHistory: (_) => const OrderHistoryPage(),
        DriverRouteNames.vehicle: (_) => const VehiclePage(),
        DriverRouteNames.addVehicle: (context) {
          final arguments = ModalRoute.of(context)?.settings.arguments;
          return AddVehiclePage(
            initialData: arguments is VehicleFormData ? arguments : null,
          );
        },
        DriverRouteNames.vehicleLegacy: (_) => const VehicleLegacyPage(),
        DriverRouteNames.profileEdit: (context) {
          final arguments = ModalRoute.of(context)?.settings.arguments;
          final values = arguments is Map<String, String>
              ? arguments
              : const <String, String>{};
          return DriverProfilePage(
            initialName: values['name'] ?? '陳大文',
            initialHongKongMacauPhone:
                values['hongKongMacauPhone'] ?? '+852 9123 4567',
            initialMainlandPhone: values['mainlandPhone'] ?? '+86 未填寫',
          );
        },
        DriverRouteNames.orderDetail: (context) {
          final arguments = ModalRoute.of(context)?.settings.arguments;
          return OrderDetailPage(tripId: arguments?.toString());
        },
        DriverRouteNames.orderAccepted: (context) => OrderAcceptedPage(
              tripId: ModalRoute.of(context)?.settings.arguments?.toString(),
            ),
        DriverRouteNames.orderInProgress: (context) => OrderInProgressPage(
              tripId: ModalRoute.of(context)?.settings.arguments?.toString(),
            ),
        DriverRouteNames.orderCompleted: (_) => const OrderCompletedPage(),
      };
}
