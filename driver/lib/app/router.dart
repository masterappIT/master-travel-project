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
import '../review_status_page.dart';
import '../vehicle_page.dart';
import '../wechat_payment_page.dart';
import '../core/api/driver_api_client.dart';
import '../settlement_overview_page.dart';
import '../language_settings_page.dart';
import '../notification_settings_page.dart';
import '../order_invite/order_invite_page.dart';
import 'route_names.dart';

abstract final class DriverRouter {
  static Map<String, WidgetBuilder> get builders => {
        DriverRouteNames.login: (_) => const LoginPage(),
        DriverRouteNames.orderInvite: (_) => const OrderInvitePage(),
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
            revisionDriver: arguments is Map<String, dynamic> &&
                    arguments.containsKey('reviewStatus')
                ? arguments
                : null,
          );
        },
        DriverRouteNames.reviewStatus: (_) => const ReviewStatusPage(),
        DriverRouteNames.home: (_) => _approved(const HomePage()),
        DriverRouteNames.orders: (_) => _approved(const OrderHallPage()),
        DriverRouteNames.orderHistory: (_) =>
            _approved(const OrderHistoryPage()),
        DriverRouteNames.profile: (_) => const ProfilePage(),
        DriverRouteNames.flightQuery: (_) => const FlightQueryPage(),
        DriverRouteNames.currency: (_) => const CurrencyPage(),
        DriverRouteNames.wechatPayment: (_) => const WechatPaymentPage(),
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
        DriverRouteNames.profileEdit: (context) {
          final arguments = ModalRoute.of(context)?.settings.arguments;
          final values = arguments is Map<String, String>
              ? arguments
              : const <String, String>{};
          return DriverProfilePage(
            initialName: values['name'] ?? '',
            initialHongKongMacauPhone: values['hongKongMacauPhone'] ?? '',
            initialMainlandPhone: values['mainlandPhone'] ?? '',
          );
        },
        DriverRouteNames.orderDetail: (context) {
          final arguments = ModalRoute.of(context)?.settings.arguments;
          return _approved(OrderDetailPage(tripId: arguments?.toString()));
        },
        DriverRouteNames.completedOrderDetail: (context) {
          final arguments = ModalRoute.of(context)?.settings.arguments;
          return _approved(OrderDetailPage(
            tripId: arguments?.toString(),
            completed: true,
          ));
        },
        DriverRouteNames.orderAccepted: (context) =>
            _approved(OrderAcceptedPage(
              tripId: ModalRoute.of(context)?.settings.arguments?.toString(),
            )),
        DriverRouteNames.orderInProgress: (context) =>
            _approved(OrderInProgressPage(
              tripId: ModalRoute.of(context)?.settings.arguments?.toString(),
            )),
        DriverRouteNames.orderCompleted: (context) =>
            _approved(OrderCompletedPage(
              tripId: ModalRoute.of(context)?.settings.arguments?.toString(),
            )),
      };

  static Widget _approved(Widget page) =>
      DriverApiClient.instance.isApproved ? page : const ReviewStatusPage();
}
