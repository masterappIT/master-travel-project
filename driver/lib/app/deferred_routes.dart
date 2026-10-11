import 'package:flutter/material.dart';

import '../about_page.dart';
import '../add_vehicle_page.dart';
import '../contact_support_page.dart';
import '../currency_page.dart';
import '../driver_profile_page.dart';
import '../flight_query_page.dart';
import '../order_accepted_page.dart';
import '../order_completed_page.dart';
import '../order_detail_page.dart';
import '../order_hall_page.dart';
import '../order_history_page.dart';
import '../order_in_progress_page.dart';
import '../profile_page.dart';
import '../registration_page.dart';
import '../vehicle_page.dart';
import '../wechat_payment_page.dart';
import '../settlement_overview_page.dart';
import '../language_settings_page.dart';
import '../notification_settings_page.dart';
import 'route_names.dart';

Widget buildDriverRoute(String route, Object? arguments) => switch (route) {
      DriverRouteNames.registration => RegistrationPage(
          initialCountryCode:
              (arguments is Map ? arguments['countryCode'] : null)?.toString(),
          initialPhone:
              (arguments is Map ? arguments['phone'] : null)?.toString(),
          verificationChallengeId:
              (arguments is Map ? arguments['challengeId'] : null)?.toString(),
          verificationCode:
              (arguments is Map ? arguments['code'] : null)?.toString(),
          revisionDriver: arguments is Map<String, dynamic> &&
                  arguments.containsKey('reviewStatus')
              ? arguments
              : null,
        ),
      DriverRouteNames.orders => const OrderHallPage(),
      DriverRouteNames.orderHistory => const OrderHistoryPage(),
      DriverRouteNames.profile => const ProfilePage(),
      DriverRouteNames.flightQuery => const FlightQueryPage(),
      DriverRouteNames.currency => const CurrencyPage(),
      DriverRouteNames.wechatPayment => const WechatPaymentPage(),
      DriverRouteNames.settlementOverview => const SettlementOverviewPage(),
      DriverRouteNames.about => const AboutPage(),
      DriverRouteNames.contactSupport => ContactSupportPage(
          trip: arguments is DriverSupportContext ? arguments : null),
      DriverRouteNames.vehicle => const VehiclePage(),
      DriverRouteNames.notificationSettings => const NotificationSettingsPage(),
      DriverRouteNames.languageSettings => const LanguageSettingsPage(),
      DriverRouteNames.addVehicle => AddVehiclePage(
          initialData: arguments is VehicleFormData ? arguments : null),
      DriverRouteNames.profileEdit => DriverProfilePage(
          initialName:
              (arguments is Map ? arguments['name'] : null)?.toString() ?? '',
          initialHongKongMacauPhone:
              (arguments is Map ? arguments['hongKongMacauPhone'] : null)
                      ?.toString() ??
                  '',
          initialMainlandPhone:
              (arguments is Map ? arguments['mainlandPhone'] : null)
                      ?.toString() ??
                  '',
        ),
      DriverRouteNames.orderDetail =>
        OrderDetailPage(tripId: arguments?.toString()),
      DriverRouteNames.completedOrderDetail =>
        OrderDetailPage(tripId: arguments?.toString(), completed: true),
      DriverRouteNames.orderAccepted =>
        OrderAcceptedPage(tripId: arguments?.toString()),
      DriverRouteNames.orderInProgress =>
        OrderInProgressPage(tripId: arguments?.toString()),
      DriverRouteNames.orderCompleted =>
        OrderCompletedPage(tripId: arguments?.toString()),
      _ => throw ArgumentError.value(route, 'route', 'Unknown driver route'),
    };
