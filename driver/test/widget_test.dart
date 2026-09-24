import 'dart:convert';
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

import 'package:driver_web/app/route_names.dart';
import 'package:driver_web/app/router.dart';
import 'package:driver_web/home_page.dart';
import 'package:driver_web/main.dart';
import 'package:driver_web/order_accepted_page.dart';
import 'package:driver_web/order_completed_page.dart';
import 'package:driver_web/order_hall_page.dart';
import 'package:driver_web/order_history_page.dart';
import 'package:driver_web/order_in_progress_page.dart';
import 'package:driver_web/notification_settings_page.dart';
import 'package:driver_web/order_detail_page.dart';

import 'package:driver_web/driver_profile_page.dart';
import 'package:driver_web/profile_page.dart';
import 'package:driver_web/registration_page.dart';
import 'package:driver_web/add_vehicle_page.dart';
import 'package:driver_web/core/api/driver_api_client.dart';
import 'package:driver_web/core/layout/driver_page_shell.dart';
import 'package:driver_web/core/platform/new_order_alert.dart';
import 'package:driver_web/core/state/driver_order_alert_coordinator.dart';
import 'package:driver_web/core/state/driver_language_preference.dart';

class _SuccessfulNewOrderAlert implements NewOrderAlert {
  @override
  Future<bool> unlock() async => true;

  @override
  Future<bool> play() async => true;

  @override
  void dispose() {}
}

Widget testApp(Widget home) {
  final routes = Map<String, WidgetBuilder>.from(DriverRouter.builders)
    ..remove('/');
  return MaterialApp(home: home, routes: routes);
}

http.Response _jsonResponse(Object body) =>
    http.Response.bytes(utf8.encode(jsonEncode(body)), 200,
        headers: {'content-type': 'application/json; charset=utf-8'});

Future<http.Response> _driverFixtureResponse(http.Request request) async {
  final path = request.url.path;
  if (path == '/vehicles') {
    return _jsonResponse({
      'categories': [
        {'name': '轎車', 'enabled': true},
        {'name': '七座商務車', 'enabled': true},
      ],
    });
  }
  if (path == '/driver/auth/me') {
    return _jsonResponse({
      'driver': {
        'name': '陳大文',
        'isOnline': true,
        'reviewStatus': 'APPROVED',
        'phoneCountryCode': '+852',
        'phone': '91234567',
      },
    });
  }
  if (path == '/driver/auth/vehicles') {
    return _jsonResponse({
      'data': [
        {
          'id': 'vehicle-primary',
          'isPrimary': true,
          'vehicleOwnership': '香港',
          'plateType': '兩地牌',
          'vehicleCategory': '轎車',
          'vehicleColor': '白色',
          'hkPlate': 'AB 1234',
        },
      ],
    });
  }
  if (path == '/driver/auth/notification-preferences') {
    return _jsonResponse({
      'notificationsOn': true,
      'orderOn': true,
      'settlementOn': true,
      'systemOn': true,
      'soundOn': true,
    });
  }
  if (path == '/driver/auth/statistics') {
    return _jsonResponse({
      'today': {'earnings': 0, 'currency': 'HKD', 'completedTrips': 0},
      'month': {'earnings': 0, 'currency': 'HKD'},
      'rating': {'average': 5},
      'recentOrders': [],
      'settlement': {'settledEarnings': 0, 'unsettledEarnings': 0},
    });
  }
  if (path == '/driver/auth/trips/available') {
    return _jsonResponse([
      {
        'id': 'trip-available',
        'pickupAddress': '香港中環置地廣場東門大堂',
        'dropoffAddress': '深圳福田口岸',
        'price': 280,
        'currency': 'HKD',
        'scheduledAt': '2024-03-20T10:00:00Z',
        'passengerName': '陳',
        'driverId': null,
        'acceptedAt': null,
      },
    ]);
  }
  if (path == '/driver/auth/trips/active') {
    return _jsonResponse([
      {
        'id': 'trip-waiting',
        'pickupAddress': '香港機場',
        'dropoffAddress': '澳門酒店',
        'price': 580,
        'currency': 'HKD',
        'scheduledAt': '2099-03-20T10:00:00Z',
        'passengerName': '李',
        'driverId': 'driver-1',
        'acceptedAt': '2024-03-01T08:00:00Z',
        'executionPhase': 'DRIVER_ASSIGNED',
      },
      {
        'id': 'trip-active',
        'pickupAddress': '深圳灣口岸',
        'dropoffAddress': '香港中環',
        'price': 680,
        'currency': 'HKD',
        'scheduledAt': '2099-03-20T09:00:00Z',
        'passengerName': '王',
        'driverId': 'driver-1',
        'acceptedAt': '2024-03-01T08:00:00Z',
        'startedAt': '2024-03-01T09:00:00Z',
        'executionPhase': 'IN_PROGRESS',
      },
    ]);
  }
  if (path == '/driver/auth/trips') {
    return _jsonResponse([
      {
        'id': 'trip-completed',
        'pickupAddress': '香港中環',
        'dropoffAddress': '深圳',
        'price': 680,
        'currency': 'HKD',
        'completedAt': '2024-03-01T10:00:00Z',
        'scheduledAt': '2024-03-01T08:00:00Z',
        'passengerName': '陳',
        'driverId': 'driver-1',
        'acceptedAt': '2024-03-01T08:00:00Z',
        'settlement': {'method': '微信支付'},
      },
      {
        'id': 'trip-driver-cancelled',
        'pickupAddress': '九龍站',
        'dropoffAddress': '香港機場',
        'price': 320,
        'currency': 'HKD',
        'scheduledAt': '2024-03-02T08:00:00Z',
        'cancelledAt': '2024-03-02T07:30:00Z',
        'cancellationSource': 'DRIVER',
        'status': 'CONFIRMED',
        'passengerName': '林',
        'settlement': null,
      },
      {
        'id': 'trip-passenger-cancelled',
        'pickupAddress': '澳門碼頭',
        'dropoffAddress': '氹仔',
        'price': 180,
        'currency': 'HKD',
        'scheduledAt': '2024-03-03T08:00:00Z',
        'acceptedAt': '2024-03-03T06:00:00Z',
        'cancelledAt': '2024-03-03T07:00:00Z',
        'cancellationSource': 'PASSENGER',
        'status': 'CANCELLED',
        'passengerName': '黃',
        'settlement': null,
      },
      {
        'id': 'trip-platform-cancelled',
        'pickupAddress': '深圳灣口岸',
        'dropoffAddress': '香港中環',
        'price': 460,
        'currency': 'HKD',
        'scheduledAt': '2024-03-04T08:00:00Z',
        'acceptedAt': '2024-03-04T06:00:00Z',
        'cancelledAt': '2024-03-04T06:30:00Z',
        'cancellationSource': 'PLATFORM',
        'status': 'CANCELLED',
        'passengerName': '何',
        'settlement': null,
      },
      {
        'id': 'trip-failed-accept',
        'pickupAddress': '不應顯示的起點',
        'dropoffAddress': '不應顯示的終點',
        'price': 200,
        'currency': 'HKD',
        'scheduledAt': '2024-03-05T08:00:00Z',
        'cancelledAt': '2024-03-05T07:00:00Z',
        'cancellationSource': 'PASSENGER',
        'status': 'CANCELLED',
        'passengerName': '失敗訂單',
        'settlement': null,
      },
    ]);
  }
  if (path.startsWith('/driver/auth/trips/')) {
    return _jsonResponse({
      'id': 'trip-1',
      'pickupAddress': '香港中環',
      'dropoffAddress': '深圳',
      'price': 280,
      'currency': 'HKD',
      'scheduledAt': '2099-03-20T10:00:00Z',
      'passengerName': '陳大文',
      'passengerPhone': '91234567',
      'acceptedAt':
          path.endsWith('/trip-accepted') ? '2024-03-20T09:00:00Z' : null,
      if (path.endsWith('/trip-accepted'))
        'vehicle': {
          'id': 'vehicle-primary',
          'vehicleOwnership': '香港',
          'plateType': '兩地牌',
          'vehicleCategory': '轎車',
          'vehicleColor': '白色',
          'hkPlate': 'AB 1234',
        },
    });
  }
  return _jsonResponse(<String, dynamic>{});
}

void main() {
  setUp(() async {
    DriverLanguagePreference.instance
        .select(DriverLanguagePreference.traditionalChinese);
    DriverApiClient.instance = DriverApiClient(
      client: MockClient(_driverFixtureResponse),
    );
    await DriverApiClient.instance.me();
  });

  testWidgets('shows vehicle ownership and type on order detail cards',
      (WidgetTester tester) async {
    await tester
        .pumpWidget(testApp(const OrderDetailPage(tripId: 'trip-accepted')));
    await tester.pumpAndSettle();

    expect(find.text('車輛所屬地：香港·兩地牌'), findsOneWidget);
    expect(find.text('車輛類型：轎車'), findsOneWidget);
  });

  testWidgets('shows accepted order waiting state and phone action',
      (WidgetTester tester) async {
    await tester.pumpWidget(testApp(const OrderAcceptedPage(tripId: 'trip-1')));
    await tester.pumpAndSettle();

    expect(find.text('等待出發'), findsOneWidget);
    expect(find.bySemanticsLabel('致電客戶'), findsOneWidget);
    expect(find.text('出發時間前一小時才可以致電客戶'), findsNothing);

    await tester.tap(find.bySemanticsLabel('致電客戶'));
    await tester.pump();
    expect(find.text('出發時間前一小時才可以致電客戶'), findsOneWidget);
  });

  testWidgets('returns directly to refreshed order hall after accepting a trip',
      (WidgetTester tester) async {
    await tester.pumpWidget(testApp(const OrderHallPage()));
    await tester.pumpAndSettle();

    await tester.tap(find.text('香港中環置地廣場東門大堂'));
    await tester.pumpAndSettle();
    expect(find.text('訂單詳情'), findsOneWidget);

    await tester.ensureVisible(find.text('確認接單'));
    await tester.tap(find.text('確認接單'));
    await tester.pumpAndSettle();
    expect(find.text('成功接單'), findsOneWidget);

    await tester.tap(find.text('返回接單大廳'));
    await tester.pumpAndSettle();
    expect(find.text('接單大廳'), findsOneWidget);
    expect(find.text('訂單詳情'), findsNothing);

    await tester.tap(find.text('我的行程'));
    await tester.pump();
    expect(find.text('查看等待中行程'), findsOneWidget);
  });

  testWidgets('shows grab failure without navigating to accepted order',
      (WidgetTester tester) async {
    DriverApiClient.instance = DriverApiClient(
      client: MockClient((request) async {
        if (request.url.path.endsWith('/accept')) {
          return http.Response(
            jsonEncode({'message': 'Trip is no longer available'}),
            409,
            headers: {'content-type': 'application/json; charset=utf-8'},
          );
        }
        return _driverFixtureResponse(request);
      }),
    );

    await tester
        .pumpWidget(testApp(const OrderDetailPage(tripId: 'trip-available')));
    await tester.pumpAndSettle();

    await tester.ensureVisible(find.text('確認接單'));
    await tester.tap(find.text('確認接單'));
    await tester.pumpAndSettle();

    expect(find.text('搶單失敗'), findsOneWidget);
    expect(find.byType(SnackBar), findsNothing);
    expect(find.text('訂單詳情'), findsOneWidget);
    expect(find.text('成功接單'), findsNothing);

    await tester.pump(const Duration(seconds: 2));
    expect(find.text('搶單失敗'), findsOneWidget);

    await tester.pump(const Duration(seconds: 1));
    expect(find.text('搶單失敗'), findsNothing);
  });

  testWidgets('system back returns from accepted trip to the order hall',
      (WidgetTester tester) async {
    await tester.pumpWidget(testApp(const OrderAcceptedPage(tripId: 'trip-1')));
    await tester.pumpAndSettle();

    await tester.binding.handlePopRoute();
    await tester.pumpAndSettle();

    expect(find.text('接單大廳'), findsOneWidget);
    expect(find.text('成功接單'), findsNothing);
  });

  testWidgets('renders the driver login page', (WidgetTester tester) async {
    await tester.pumpWidget(
      const DriverApp(initialRoute: DriverRouteNames.login),
    );

    expect(find.bySemanticsLabel('Master App'), findsOneWidget);
    expect(find.text('司機工作台 · 安全接送每一程'), findsOneWidget);
    expect(find.text('登入 / 註冊'), findsOneWidget);
  });

  testWidgets(
      'prefills Hong Kong registration phone and asks for mainland phone',
      (WidgetTester tester) async {
    await tester.pumpWidget(testApp(const RegistrationPage(
      initialCountryCode: '+852',
      initialPhone: '91234567',
      verificationChallengeId: 'challenge',
      verificationCode: '00000',
    )));

    expect(find.text('香港／澳門號碼'), findsOneWidget);
    expect(find.text('中國內地號碼'), findsOneWidget);
    expect(find.widgetWithText(TextField, '91234567'), findsOneWidget);
    expect(find.text('+86'), findsOneWidget);
  });

  testWidgets(
      'prefills mainland registration phone and asks for Hong Kong phone',
      (WidgetTester tester) async {
    await tester.pumpWidget(testApp(const RegistrationPage(
      initialCountryCode: '+86',
      initialPhone: '13800138000',
      verificationChallengeId: 'challenge',
      verificationCode: '00000',
    )));

    expect(find.widgetWithText(TextField, '13800138000'), findsOneWidget);
    expect(find.text('香港 +852'), findsOneWidget);
  });

  testWidgets('disables submission until registration details are complete',
      (WidgetTester tester) async {
    await tester.pumpWidget(testApp(const RegistrationPage(
      initialCountryCode: '+852',
      initialPhone: '91234567',
      verificationChallengeId: 'challenge',
      verificationCode: '00000',
    )));

    expect(find.text('請完成必填資料'), findsOneWidget);
    expect(find.text('提交審核'), findsNothing);
  });

  testWidgets('uses mainland and Hong Kong plates for mainland ownership',
      (WidgetTester tester) async {
    await tester.pumpWidget(testApp(const RegistrationPage(
      verificationChallengeId: 'challenge',
      verificationCode: '00000',
    )));
    await tester.pumpAndSettle();

    await tester.tap(find.text('中國內地'));
    await tester.pump();

    expect(find.text('單牌'), findsNothing);
    expect(find.text('兩地牌'), findsOneWidget);
    expect(find.text('三地牌'), findsNothing);
    expect(find.text('內地車牌'), findsOneWidget);
    expect(find.text('香港車牌'), findsOneWidget);
    expect(find.text('澳門車牌'), findsNothing);
  });

  testWidgets('updates plate fields from region and plate type selections',
      (WidgetTester tester) async {
    await tester.pumpWidget(testApp(const RegistrationPage(
      verificationChallengeId: 'challenge',
      verificationCode: '00000',
    )));
    await tester.pumpAndSettle();

    expect(find.text('香港車牌'), findsOneWidget);
    expect(find.text('澳門車牌'), findsNothing);
    expect(find.text('內地車牌'), findsOneWidget);

    await tester.tap(find.text('單牌'));
    await tester.pump();
    expect(find.text('香港車牌'), findsOneWidget);
    expect(find.text('澳門車牌'), findsNothing);
    expect(find.text('內地車牌'), findsNothing);

    await tester.tap(find.text('澳門'));
    await tester.pump();
    expect(find.text('澳門車牌'), findsOneWidget);
    expect(find.text('香港車牌'), findsNothing);

    await tester.tap(find.text('兩地牌'));
    await tester.pump();
    expect(find.text('澳門車牌'), findsOneWidget);
    expect(find.text('內地車牌'), findsOneWidget);

    await tester.tap(find.text('三地牌'));
    await tester.pump();
    expect(find.text('香港車牌'), findsOneWidget);
    expect(find.text('澳門車牌'), findsOneWidget);
    expect(find.text('內地車牌'), findsOneWidget);
  });

  testWidgets('matches vehicle plate fields to ownership and plate type',
      (WidgetTester tester) async {
    await tester.pumpWidget(testApp(const AddVehiclePage()));

    expect(find.text('香港車牌'), findsOneWidget);
    expect(find.text('內地車牌'), findsOneWidget);
    expect(find.text('澳門車牌'), findsNothing);

    await tester.tap(find.text('單牌'));
    await tester.pump();
    expect(find.text('香港車牌'), findsOneWidget);
    expect(find.text('內地車牌'), findsNothing);

    await tester.tap(find.text('澳門'));
    await tester.pump();
    expect(find.text('澳門車牌'), findsOneWidget);
    expect(find.text('香港車牌'), findsNothing);

    await tester.tap(find.text('兩地牌'));
    await tester.pump();
    expect(find.text('澳門車牌'), findsOneWidget);
    expect(find.text('內地車牌'), findsOneWidget);

    await tester.tap(find.text('三地牌'));
    await tester.pump();
    expect(find.text('香港車牌'), findsOneWidget);
    expect(find.text('澳門車牌'), findsOneWidget);
    expect(find.text('內地車牌'), findsOneWidget);

    await tester.tap(find.text('中國內地'));
    await tester.pump();
    expect(find.text('三地牌'), findsNothing);
    expect(find.text('兩地牌'), findsOneWidget);
    expect(find.text('內地車牌'), findsOneWidget);
    expect(find.text('香港車牌'), findsOneWidget);
    expect(find.text('澳門車牌'), findsNothing);
  });
  testWidgets('renders the driver home page and toggles online status',
      (WidgetTester tester) async {
    await tester.pumpWidget(testApp(const HomePage()));
    await tester.pumpAndSettle();

    expect(find.text('陳大文'), findsOneWidget);
    expect(find.text('今日收入'), findsOneWidget);
    expect(find.text('目前狀態：在線接單'), findsOneWidget);
    expect(find.text('首頁'), findsOneWidget);

    await tester.tap(find.text('目前狀態：在線接單'));
    await tester.pump();

    expect(find.text('目前狀態：離線'), findsOneWidget);
  });

  testWidgets('renders and edits the standalone driver profile page',
      (WidgetTester tester) async {
    await tester.pumpWidget(testApp(const DriverProfilePage(
      initialName: '陳大文',
      initialHongKongMacauPhone: '+852 9123 4567',
      initialMainlandPhone: '+86 未填寫',
    )));

    expect(find.text('個人資料'), findsOneWidget);
    expect(find.text('基本資料'), findsOneWidget);
    expect(find.text('香港 +852'), findsOneWidget);
    expect(find.text('9123 4567'), findsOneWidget);
    expect(find.text('+86'), findsOneWidget);
    expect(find.text('未填寫'), findsOneWidget);
    expect(find.text('修改'), findsOneWidget);

    await tester.tap(find.byKey(const ValueKey('driver-profile-edit')));
    await tester.pump();
    expect(find.byType(TextField), findsNWidgets(3));
  });

  testWidgets('uses Macau prefix for a Macau profile phone',
      (WidgetTester tester) async {
    await tester.pumpWidget(testApp(const DriverProfilePage(
      initialHongKongMacauPhone: '+853 6123 4567',
      initialMainlandPhone: '+86 13800138000',
    )));

    expect(find.text('澳門 +853'), findsOneWidget);
    expect(find.text('6123 4567'), findsOneWidget);
    expect(find.text('13800138000'), findsOneWidget);
  });
  testWidgets('renders the driver profile page and navigation',
      (WidgetTester tester) async {
    await tester.pumpWidget(testApp(const ProfilePage()));
    await tester.pumpAndSettle();

    expect(find.text('陳大文'), findsOneWidget);
    expect(find.text('結算概覽'), findsOneWidget);
    expect(find.text('個人資料'), findsOneWidget);
    expect(find.text('登出帳號'), findsOneWidget);
    expect(find.text('我的'), findsOneWidget);
  });

  testWidgets('shows the new-order alert sound setting',
      (WidgetTester tester) async {
    await tester.pumpWidget(testApp(const NotificationSettingsPage()));
    await tester.pumpAndSettle();

    expect(find.text('新訂單提示聲'), findsOneWidget);
    expect(find.text('有新可接訂單時播放提示聲'), findsOneWidget);
    expect(find.text('測試提示聲'), findsOneWidget);
  });

  testWidgets('tests the new-order alert sound from settings',
      (WidgetTester tester) async {
    await tester.pumpWidget(testApp(NotificationSettingsPage(
      newOrderAlert: _SuccessfulNewOrderAlert(),
    )));
    await tester.pumpAndSettle();

    await tester.tap(find.text('測試提示聲'));
    await tester.pumpAndSettle();

    expect(find.text('提示聲已播放'), findsOneWidget);
  });

  testWidgets('requires acknowledgement for a cancelled accepted trip',
      (WidgetTester tester) async {
    var acknowledged = false;
    final client = DriverApiClient(client: MockClient((request) async {
      final path = request.url.path;
      if (path == '/driver/auth/phone/verify') {
        return _jsonResponse({
          'token': 'test-token',
          'expiresAt': '2099-01-01T00:00:00Z',
          'driver': {'id': 'driver-1', 'reviewStatus': 'APPROVED'},
        });
      }
      if (path == '/driver/auth/trips/active') return _jsonResponse([]);
      if (path == '/driver/auth/trips/available') return _jsonResponse([]);
      if (path == '/driver/auth/trips/events/ticket' ||
          path == '/driver/auth/notifications/events/ticket') {
        return _jsonResponse({'ticket': ''});
      }
      if (path == '/driver/auth/notifications/cancellations/pending') {
        return _jsonResponse(acknowledged
            ? []
            : [
                {
                  'id': 'notification-1',
                  'tripId': 'cmueh27gu001t8oqsvwep1ooo',
                  'title': '客戶已取消行程',
                  'content': '客戶已取消此行程，請停止前往。',
                  'trip': {
                    'id': 'cmueh27gu001t8oqsvwep1ooo',
                    'origin': '香港中環',
                    'destination': '深圳灣口岸',
                    'scheduledAt': '2099-03-20T10:00:00Z',
                  },
                },
              ]);
      }
      if (path == '/driver/auth/notifications/notification-1/read') {
        acknowledged = true;
        return _jsonResponse({'id': 'notification-1'});
      }
      return _jsonResponse(<String, dynamic>{});
    }));
    DriverApiClient.instance = client;
    await client.verifyPhoneCode(challengeId: 'challenge', code: '00000');
    final navigatorKey = GlobalKey<NavigatorState>();
    final messengerKey = GlobalKey<ScaffoldMessengerState>();

    await tester.pumpWidget(DriverOrderAlertCoordinator(
      navigatorKey: navigatorKey,
      child: MaterialApp(
        navigatorKey: navigatorKey,
        scaffoldMessengerKey: messengerKey,
        home: const Scaffold(body: Text('司機首頁')),
      ),
    ));
    await tester.pumpAndSettle();

    expect(find.text('客戶已取消行程'), findsOneWidget);
    expect(find.text('訂單編號：A02700181'), findsOneWidget);
    expect(find.textContaining('cmueh27gu001t8oqsvwep1ooo'), findsNothing);
    expect(find.text('香港中環 → 深圳灣口岸'), findsOneWidget);
    expect(find.text('我知道了'), findsOneWidget);

    await tester.tap(find.text('我知道了'));
    await tester.pumpAndSettle();

    expect(acknowledged, isTrue);
    expect(find.text('客戶已取消行程'), findsNothing);
    await tester.pumpWidget(const SizedBox.shrink());
  });

  testWidgets('shows waiting and active trips in my trips',
      (WidgetTester tester) async {
    await tester.pumpWidget(testApp(const OrderHallPage()));
    await tester.pumpAndSettle();

    expect(find.text('接單大廳'), findsOneWidget);
    expect(find.text('線上接單中'), findsOneWidget);
    expect(find.text('香港中環置地廣場東門大堂'), findsOneWidget);
    expect(find.text('待接行程'), findsOneWidget);
    expect(find.text('深圳福田口岸'), findsOneWidget);

    await tester.tap(find.text('我的行程'));
    await tester.pump();

    expect(find.text('查看進行中行程'), findsOneWidget);
    expect(find.text('查看等待中行程'), findsOneWidget);
    expect(find.text('進行中'), findsOneWidget);
    expect(find.text('等待中'), findsOneWidget);
    expect(find.text('深圳灣口岸'), findsOneWidget);
    expect(find.text('香港機場'), findsOneWidget);
    expect(find.text('香港中環置地廣場東門大堂'), findsNothing);
  });
  test('detects public and newly assigned alert orders', () {
    final ids = driverAlertTripIds(
      availableTrips: [
        {'id': 'public-trip'},
      ],
      assignedTrips: [
        {
          'id': 'assigned-trip',
          'driverId': 'driver-1',
          'executionPhase': 'DRIVER_PENDING_ACCEPTANCE',
          'completedAt': null,
        },
        {
          'id': 'accepted-trip',
          'driverId': 'driver-1',
          'executionPhase': 'DRIVER_ASSIGNED',
          'completedAt': null,
        },
        {
          'id': 'completed-trip',
          'driverId': 'driver-1',
          'executionPhase': 'DRIVER_PENDING_ACCEPTANCE',
          'completedAt': '2026-09-22T00:00:00Z',
        },
      ],
    );

    expect(ids, {'public-trip', 'assigned-trip'});
  });

  test('plays only for genuinely new alert orders when enabled', () {
    expect(
      shouldPlayDriverOrderAlert(
        previousIds: null,
        currentIds: {'trip-1'},
        enabled: true,
      ),
      isFalse,
    );
    expect(
      shouldPlayDriverOrderAlert(
        previousIds: {'trip-1'},
        currentIds: {'trip-1', 'assigned-trip'},
        enabled: true,
      ),
      isTrue,
    );
    expect(
      shouldPlayDriverOrderAlert(
        previousIds: {'trip-1'},
        currentIds: {'trip-1'},
        enabled: true,
      ),
      isFalse,
    );
    expect(
      shouldPlayDriverOrderAlert(
        previousIds: {'trip-1'},
        currentIds: {'trip-1', 'trip-2'},
        enabled: false,
      ),
      isFalse,
    );
  });

  test('uses the primary vehicle before acceptance and the trip snapshot after',
      () {
    final primaryVehicle = {
      'id': 'vehicle-primary',
      'vehicleCategory': '七座商務車',
      'vehicleColor': '珍珠白',
      'hkPlate': 'AB 1234',
    };
    final snapshot = {
      'vehicleId': 'vehicle-primary',
      'vehicleCategory': '跨境轎車',
      'vehicleColor': '曜石黑',
      'vehiclePlate': 'SNAP 88',
    };

    expect(
      selectTripVehicle(
        accepted: false,
        completed: false,
        snapshot: snapshot,
        currentVehicle: primaryVehicle,
      ),
      same(primaryVehicle),
    );
    expect(
      selectTripVehicle(
        accepted: true,
        completed: false,
        snapshot: snapshot,
        currentVehicle: primaryVehicle,
      ),
      snapshot,
    );
    expect(
      selectTripVehicle(
        accepted: false,
        completed: true,
        snapshot: snapshot,
        currentVehicle: primaryVehicle,
      ),
      snapshot,
    );
    expect(
      selectTripVehicle(
        accepted: true,
        completed: false,
        snapshot: null,
        currentVehicle: primaryVehicle,
      ),
      isNull,
    );
  });

  testWidgets('renders in-progress order page content',
      (WidgetTester tester) async {
    await tester
        .pumpWidget(testApp(const OrderInProgressPage(tripId: 'trip-1')));
    await tester.pumpAndSettle();

    expect(find.text('進行中'), findsNWidgets(2));
    expect(find.text('香港中環 → 深圳'), findsOneWidget);
    expect(find.text('陳'), findsOneWidget);
    expect(find.text('陳大文'), findsNWidgets(2));
    expect(find.text('出發地'), findsOneWidget);
    expect(find.text('目的地'), findsOneWidget);
    expect(find.text('出發時間'), findsOneWidget);
    expect(find.text('乘客'), findsOneWidget);
    expect(find.text('車資'), findsOneWidget);
    expect(find.text('HK\$280.00'), findsOneWidget);
    expect(find.text('確認到達目的地'), findsOneWidget);
  });

  testWidgets('opens completed page from in-progress action',
      (WidgetTester tester) async {
    await tester
        .pumpWidget(testApp(const OrderInProgressPage(tripId: 'trip-1')));
    await tester.pumpAndSettle();

    await tester.ensureVisible(find.text('確認到達目的地'));
    await tester.tap(find.text('確認到達目的地'));
    await tester.pumpAndSettle();

    expect(find.text('行程已抵達目的地'), findsOneWidget);
    expect(find.text('確認完成'), findsOneWidget);
  });

  testWidgets('renders order history page content',
      (WidgetTester tester) async {
    await tester.pumpWidget(testApp(const OrderHistoryPage()));
    await tester.pumpAndSettle();

    expect(find.text('接單紀錄'), findsOneWidget);
    expect(find.text('已結算'), findsWidgets);
    expect(find.text('未結算'), findsWidgets);
    expect(find.text('2024年3月1日'), findsOneWidget);
    expect(find.text('出發：香港中環'), findsOneWidget);
    expect(find.text('目的：深圳'), findsOneWidget);
    expect(find.text('HK\$680.00'), findsOneWidget);
    expect(find.text('司機取消'), findsOneWidget);
    expect(find.text('乘客取消'), findsOneWidget);
    expect(find.text('平台取消'), findsOneWidget);
    expect(find.text('不應顯示的起點'), findsNothing);

    await tester.tap(find.text('未結算').first);
    await tester.pump();
    expect(find.text('接單紀錄'), findsOneWidget);
    expect(find.text('司機取消'), findsOneWidget);
    expect(find.text('乘客取消'), findsOneWidget);
    expect(find.text('平台取消'), findsOneWidget);
    expect(find.text('出發：香港中環'), findsNothing);
  });

  testWidgets('opens order history from profile menu',
      (WidgetTester tester) async {
    await tester.pumpWidget(testApp(const ProfilePage()));
    await tester.pumpAndSettle();

    await tester.ensureVisible(find.text('接單紀錄'));
    await tester.tap(find.text('接單紀錄'));
    await tester.pumpAndSettle();

    expect(find.text('2024年3月1日'), findsOneWidget);
    expect(find.text('出發：香港中環'), findsOneWidget);
  });

  testWidgets('opens profile from the bottom navigation',
      (WidgetTester tester) async {
    await tester.pumpWidget(testApp(const HomePage()));
    await tester.pumpAndSettle();

    await tester.tap(find.text('我的'));
    await tester.pumpAndSettle();

    expect(find.text('結算概覽'), findsOneWidget);
    expect(find.text('登出帳號'), findsOneWidget);
  });

  testWidgets('opens vehicle preview from the profile menu',
      (WidgetTester tester) async {
    await tester.pumpWidget(testApp(const ProfilePage()));
    await tester.pumpAndSettle();

    await tester.ensureVisible(find.text('車輛資料'));
    await tester.tap(find.text('車輛資料'));
    await tester.pumpAndSettle();

    expect(find.text('車輛資料'), findsOneWidget);
    expect(find.text('轎車'), findsOneWidget);
    expect(find.text('使用中'), findsOneWidget);
    expect(find.text('AB 1234'), findsOneWidget);
  });

  test('maps assigned vehicle fields and primary status', () {
    final vehicles = [
      {
        'id': 'vehicle-primary',
        'isPrimary': true,
        'vehicleOwnership': '香港',
        'plateType': '兩地牌',
        'vehicleCategory': '轎車',
        'hkPlate': 'AB 1234',
        'macauPlate': '',
        'mainlandPlate': '粵Z CD5678',
        'vehicleColor': '白色',
      },
      {
        'id': 'vehicle-secondary',
        'isPrimary': false,
        'vehicleOwnership': '澳門',
        'plateType': '單牌',
        'vehicleCategory': 'MPV',
        'hkPlate': '',
        'macauPlate': 'AA-12-34',
        'mainlandPlate': '',
        'vehicleColor': '黑色',
      },
    ].map(VehicleFormData.fromJson).toList();

    expect(vehicles, hasLength(2));
    expect(vehicles.first.id, 'vehicle-primary');
    expect(vehicles.first.isPrimary, isTrue);
    expect(vehicles.first.mainlandPlate, '粵Z CD5678');
    expect(vehicles.last.id, 'vehicle-secondary');
    expect(vehicles.last.isPrimary, isFalse);
    expect(vehicles.last.macauPlate, 'AA-12-34');
  });

  test('uses driver vehicle endpoints for list, create, update and management',
      () async {
    final requests = <http.Request>[];
    final api = DriverApiClient(
      baseUrl: 'https://driver.example.test',
      client: MockClient((request) async {
        requests.add(request);
        return http.Response('{}', 200);
      }),
    );
    final fields = {
      'vehicleOwnership': '香港',
      'plateType': '單牌',
      'hkPlate': 'AB 1234',
      'vehicleCategory': '轎車',
      'vehicleColor': '白色',
    };

    await api.listDriverVehicles();
    await api.createVehicle(
      fields,
      vehiclePhotoBytes: Uint8List.fromList('photo'.codeUnits),
      vehiclePhotoFilename: 'vehicle.jpg',
      vehiclePhotoMime: 'image/jpeg',
    );
    await api.updateVehicle('vehicle/1', fields);
    await api.setPrimaryVehicle('vehicle/1');
    await api.deleteVehicle('vehicle/1');

    expect(requests.map((request) => request.method),
        ['GET', 'POST', 'PATCH', 'POST', 'DELETE']);
    expect(requests.map((request) => request.url.path), [
      '/driver/auth/vehicles',
      '/driver/auth/vehicles',
      '/driver/auth/vehicles/vehicle%2F1',
      '/driver/auth/vehicles/vehicle%2F1/primary',
      '/driver/auth/vehicles/vehicle%2F1',
    ]);
    expect(
        requests[1].headers['content-type'], startsWith('multipart/form-data'));
    expect(requests[1].body, contains('name="vehicleOwnership"'));
    expect(requests[1].body, contains('香港'));
    expect(requests[1].body, contains('name="vehiclePhoto"'));
    expect(requests[1].body, contains('filename="vehicle.jpg"'));
    expect(requests[1].body, contains('content-type: image/jpeg'));
    expect(
        requests[2].headers['content-type'], startsWith('multipart/form-data'));
    expect(requests[2].body, contains('name="vehicleColor"'));
    expect(requests[2].body, contains('白色'));
    expect(requests[2].body, isNot(contains('name="vehiclePhoto"')));
  });

  test('uses driver trip endpoints for listing, detail and acceptance',
      () async {
    final requests = <http.Request>[];
    final api = DriverApiClient(
      baseUrl: 'https://driver.example.test',
      client: MockClient((request) async {
        requests.add(request);
        if (request.method == 'GET' &&
            (request.url.path == '/driver/auth/trips' ||
                request.url.path == '/driver/auth/trips/active' ||
                request.url.path == '/driver/auth/trips/available')) {
          return http.Response('[]', 200);
        }
        return http.Response('{}', 200);
      }),
    );

    await api.trips();
    await api.activeTrips();
    await api.availableTrips();
    await api.trip('trip/1');
    await api.acceptTrip('trip/1', vehicleId: 'vehicle/2');

    expect(requests.map((request) => request.method), [
      'GET',
      'GET',
      'GET',
      'GET',
      'POST',
    ]);
    expect(requests.map((request) => request.url.path), [
      '/driver/auth/trips',
      '/driver/auth/trips/active',
      '/driver/auth/trips/available',
      '/driver/auth/trips/trip%2F1',
      '/driver/auth/trips/trip%2F1/accept',
    ]);
    expect(jsonDecode(requests.last.body), {'vehicleId': 'vehicle/2'});
  });

  test('uses account notification preference and statistics endpoints',
      () async {
    final requests = <http.Request>[];
    final api = DriverApiClient(
      baseUrl: 'https://driver.example.test',
      client: MockClient((request) async {
        requests.add(request);
        return http.Response('{}', 200);
      }),
    );
    final preferences = {
      'notificationsOn': true,
      'orderOn': false,
      'settlementOn': true,
      'systemOn': false,
      'soundOn': true,
    };

    await api.notificationPreferences();
    await api.updateNotificationPreferences(preferences);
    await api.statistics();

    expect(requests[0].method, 'GET');
    expect(requests[0].url.path, '/driver/auth/notification-preferences');
    expect(requests[1].method, 'PATCH');
    expect(requests[1].url.path, '/driver/auth/notification-preferences');
    expect(jsonDecode(requests[1].body), preferences);
    expect(requests[2].method, 'GET');
    expect(requests[2].url.path, '/driver/auth/statistics');
  });

  test('maps the selected driver language', () {
    final preference = DriverLanguagePreference.instance;
    addTearDown(
        () => preference.select(DriverLanguagePreference.traditionalChinese));

    preference.select(DriverLanguagePreference.simplifiedChinese);
    expect(driverText('首頁', '首页', 'Home'), '首页');

    preference.select(DriverLanguagePreference.english);
    expect(driverText('首頁', '首页', 'Home'), 'Home');

    preference.select(DriverLanguagePreference.traditionalChinese);
    expect(driverText('首頁', '首页', 'Home'), '首頁');
  });

  testWidgets('navigates from order history to order hall',
      (WidgetTester tester) async {
    await tester.pumpWidget(testApp(const OrderHistoryPage()));
    await tester.pumpAndSettle();

    await tester.tap(find.text('接單'));
    await tester.pumpAndSettle();

    expect(find.text('接單大廳'), findsOneWidget);
  });

  testWidgets('renders completed order page content',
      (WidgetTester tester) async {
    await tester
        .pumpWidget(testApp(const OrderCompletedPage(tripId: 'trip-1')));
    await tester.pumpAndSettle();

    expect(find.text('行程已抵達目的地'), findsOneWidget);
    expect(find.text('請與乘客確認車資並完成收款'), findsNothing);
    expect(find.text('城市天際線預覽'), findsOneWidget);
    expect(find.text('訂單詳情'), findsOneWidget);
    expect(find.text('車資'), findsOneWidget);
    expect(find.text('總計應收'), findsOneWidget);
    expect(find.text('HK\$280.00'), findsOneWidget);
    expect(find.text('確認完成'), findsOneWidget);

    await tester.ensureVisible(find.text('確認完成'));
    await tester.tap(find.text('確認完成'));
    await tester.pumpAndSettle();

    expect(find.text('接單大廳'), findsOneWidget);
    expect(find.text('可接單'), findsOneWidget);
  });

  testWidgets('uses one Flutter scroll container for mobile page movement',
      (WidgetTester tester) async {
    await tester.pumpWidget(
      testApp(
        DriverPageShell(
          selectedIndex: 0,
          child: Column(
            children: List<Widget>.generate(
              20,
              (index) => SizedBox(
                height: 80,
                child: Text('scroll item $index'),
              ),
            ),
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.byType(SingleChildScrollView), findsOneWidget);
    final scrollView = tester.widget<SingleChildScrollView>(
      find.byType(SingleChildScrollView),
    );
    expect(scrollView.physics, isA<BouncingScrollPhysics>());
    expect(find.text('scroll item 19'), findsOneWidget);

    await tester.drag(
        find.byType(SingleChildScrollView), const Offset(0, -500));
    await tester.pumpAndSettle();

    final controller = scrollView.controller!;
    expect(controller.offset, greaterThan(0));
  });

  testWidgets('renders core pages without viewport exceptions',
      (WidgetTester tester) async {
    addTearDown(() {
      tester.view.resetPhysicalSize();
      tester.view.resetDevicePixelRatio();
    });
    tester.view.devicePixelRatio = 1;

    const widths = [320.0, 430.0, 768.0, 1440.0];
    const pages = <Widget>[
      HomePage(),
      OrderHallPage(),
      OrderHistoryPage(),
      ProfilePage(),
    ];

    for (final width in widths) {
      tester.view.physicalSize = Size(width, 932);
      for (final page in pages) {
        await tester.pumpWidget(KeyedSubtree(
          key: UniqueKey(),
          child: testApp(page),
        ));
        await tester.pumpAndSettle();
        expect(tester.takeException(), isNull,
            reason: '${page.runtimeType} failed at ${width.toInt()}px');
      }
    }
  });
}
