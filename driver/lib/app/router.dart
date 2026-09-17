import 'package:flutter/material.dart';

import '../about_page.dart';
import '../add_vehicle_page.dart';
import '../auth/login_page.dart';
import '../contact_support_page.dart';
import '../currency_page.dart';
import '../driver_profile_page.dart';
import '../home_page.dart';
import '../flight_query_page.dart';
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
import '../settlement_overview_page.dart';
import '../language_settings_page.dart';
import '../notification_settings_page.dart';
import 'route_names.dart';

abstract final class DriverRouter {
  static Map<String, WidgetBuilder> get builders => {
        DriverRouteNames.login: (_) => const LoginPage(),
        DriverRouteNames.registration: (context) {
          final arguments = ModalRoute.of(context)?.settings.arguments;
          final values = arguments is Map<String, String>
              ? arguments
              : const <String, String>{};
          return RegistrationPage(
            initialCountryCode: values['countryCode'],
            initialPhone: values['phone'],
            verificationChallengeId: values['challengeId'],
            verificationCode: values['code'],
          );
        },
        DriverRouteNames.home: (_) => const HomePage(),
        DriverRouteNames.orders: (_) => const OrderHallPage(),
        DriverRouteNames.orderHistory: (_) => const OrderHistoryPage(),
        DriverRouteNames.profile: (_) => const ProfilePage(),
        DriverRouteNames.flightQuery: (_) => const FlightQueryPage(),
        DriverRouteNames.currency: (_) => const CurrencyPage(),
        DriverRouteNames.settlementOverview: (_) =>
            const SettlementOverviewPage(),
        DriverRouteNames.about: (_) => const AboutPage(),
        DriverRouteNames.contactSupport: (_) => const ContactSupportPage(),
        DriverRouteNames.vehicle: (_) => const VehiclePage(),
        DriverRouteNames.notificationSettings: (_) =>
            const NotificationSettingsPage(),
        DriverRouteNames.languageSettings: (_) => const LanguageSettingsPage(),
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
