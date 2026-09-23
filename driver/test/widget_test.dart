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
import 'package:driver_web/core/state/driver_order_alert_coordinator.dart';
import 'package:driver_web/core/state/driver_language_preference.dart';

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
  if (path == '/driver/auth/trips' || path == '/driver/auth/trips/available') {
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
    await tester.pumpWidget(testApp(const OrderDetailPage(tripId: 'trip-1')));
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
  });

  testWidgets('switches between available and accepted orders',
      (WidgetTester tester) async {
    await tester.pumpWidget(testApp(const OrderHallPage()));
    await tester.pumpAndSettle();

    expect(find.text('接單大廳'), findsOneWidget);
    expect(find.text('線上接單中'), findsOneWidget);
    expect(find.text('香港中環置地廣場東門大堂'), findsOneWidget);
    expect(find.text('深圳福田口岸'), findsOneWidget);
    expect(find.text('暫無成功接單'), findsNothing);

    await tester.tap(find.text('成功接單'));
    await tester.pump();

    expect(find.text('暫無成功接單'), findsOneWidget);
    expect(find.text('香港中環置地廣場東門大堂'), findsNothing);
    expect(find.text('深圳福田口岸'), findsNothing);
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

    await tester.tap(find.text('未結算').first);
    await tester.pump();
    expect(find.text('接單紀錄'), findsOneWidget);
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
                request.url.path == '/driver/auth/trips/available')) {
          return http.Response('[]', 200);
        }
        return http.Response('{}', 200);
      }),
    );

    await api.trips();
    await api.availableTrips();
    await api.trip('trip/1');
    await api.acceptTrip('trip/1', vehicleId: 'vehicle/2');

    expect(requests.map((request) => request.method), [
      'GET',
      'GET',
      'GET',
      'POST',
    ]);
    expect(requests.map((request) => request.url.path), [
      '/driver/auth/trips',
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
