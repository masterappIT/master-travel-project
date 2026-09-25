import 'dart:convert';

import 'package:driver_web/order_invite/order_invite_api_client.dart';
import 'package:driver_web/order_invite/order_invite_page.dart';
import 'package:driver_web/order_invite/order_invite_recognition.dart';
import 'package:driver_web/order_invite/order_invite_session_store.dart';
import 'package:driver_web/core/vehicle_plate_rules.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

void main() {
  testWidgets('restores scoped provisional session and advances trip actions',
      (tester) async {
    final store = _MemorySessionStore()..write('invite-1', 'session-token');
    var arrived = false;
    var started = false;
    var completed = false;
    var settled = false;
    var reviewSubmitted = false;
    final api = OrderInviteApiClient(
      baseUrl: 'https://driver.test',
      client: MockClient((request) async {
        final requiresAuthorization = request.url.path.endsWith('/session') ||
            request.url.path.contains('/trip/') ||
            request.url.path.endsWith('/formal-review');
        if (requiresAuthorization) {
          expect(request.headers['authorization'], 'Bearer session-token');
        } else {
          expect(request.headers['authorization'], isNull);
        }
        if (request.url.path == '/vehicles') {
          return http.Response(jsonEncode({'categories': []}), 200);
        }
        if (request.url.path.endsWith('/session')) {
          return http.Response.bytes(
              utf8.encode(jsonEncode(_tripResponse(
                  arrived: arrived,
                  started: started,
                  completed: completed,
                  settled: settled))),
              200);
        }
        if (request.url.path.endsWith('/trip/arrive')) arrived = true;
        if (request.url.path.endsWith('/trip/start')) started = true;
        if (request.url.path.endsWith('/trip/complete')) {
          expect(request.body, isEmpty);
          completed = true;
        }
        if (request.url.path.endsWith('/trip/settlement')) {
          expect(completed, isTrue);
          final body = jsonDecode(request.body) as Map<String, dynamic>;
          expect(body['settlementMethod'], '微信支付');
          expect(body['settlementAccount'], 'driver-wechat');
          settled = true;
        }
        if (request.url.path.endsWith('/formal-review')) {
          reviewSubmitted = true;
          return http.Response(jsonEncode({'reviewStatus': 'PENDING'}), 200);
        }
        if (request.url.path.contains('/trip/')) {
          return http.Response.bytes(
              utf8.encode(jsonEncode(_tripResponse(
                  arrived: arrived,
                  started: started,
                  completed: completed,
                  settled: settled))),
              200);
        }
        return http.Response.bytes(
            utf8.encode(jsonEncode({
              'invitation': {'id': 'invite-1', 'status': 'ACCEPTED'},
              'trip': {
                'id': 'trip-1',
                'origin': '中環',
                'destination': '機場',
                'scheduledAt': '2026-10-01T08:00:00.000Z',
              },
            })),
            200);
      }),
    );

    await tester.pumpWidget(MaterialApp(
      home:
          OrderInvitePage(token: 'invite-token', api: api, sessionStore: store),
    ));
    await tester.pumpAndSettle();

    expect(find.text('已到達上車地點'), findsOneWidget);
    expect(find.text('取消訂單'), findsOneWidget);
    await tester.ensureVisible(find.text('已到達上車地點'));
    await tester.tap(find.text('已到達上車地點'));
    await tester.pumpAndSettle();
    expect(find.text('開始行程'), findsOneWidget);

    await tester.ensureVisible(find.text('開始行程'));
    await tester.tap(find.text('開始行程'));
    await tester.pumpAndSettle();
    expect(find.text('取消訂單'), findsNothing);
    expect(find.text('結算方式'), findsNothing);
    expect(find.text('完成行程'), findsOneWidget);
    expect(find.text('陳小姐（女）'), findsOneWidget);
    expect(find.text('+852 ****5678'), findsOneWidget);
    expect(find.text('HKD 380'), findsOneWidget);

    await tester.ensureVisible(find.text('完成行程'));
    await tester.tap(find.text('完成行程'));
    await tester.pumpAndSettle();
    expect(find.text('結算方式'), findsWidgets);
    expect(find.text('提交結算方式'), findsOneWidget);

    await tester.enterText(
        find.widgetWithText(TextField, '請填寫微信 ID'), 'driver-wechat');
    await tester.ensureVisible(find.text('提交結算方式'));
    await tester.tap(find.text('提交結算方式'));
    await tester.pumpAndSettle();
    expect(settled, isTrue);
    expect(find.text('提交正式司機審核'), findsOneWidget);

    await tester.ensureVisible(find.text('提交正式司機審核'));
    await tester.tap(find.text('提交正式司機審核'));
    await tester.pumpAndSettle();
    expect(reviewSubmitted, isTrue);
    expect(find.text('正式司機審核已提交'), findsOneWidget);
  });

  testWidgets('shows masked invitation preview before acceptance',
      (tester) async {
    final api = OrderInviteApiClient(
      baseUrl: 'https://driver.test',
      client: MockClient((request) async {
        if (request.url.path == '/vehicles') {
          return http.Response(jsonEncode({'categories': []}), 200);
        }
        return http.Response.bytes(
          utf8.encode(jsonEncode({
            'invitation': {'id': 'invite-1', 'status': 'ACTIVE'},
            'trip': {
              'id': 'trip-1',
              'origin': '中環',
              'destination': '機場',
              'scheduledAt': '2026-10-01T08:00:00.000Z',
              'vehicleCategory': '轎車',
            },
          })),
          200,
          headers: {'content-type': 'application/json; charset=utf-8'},
        );
      }),
    );

    await tester.pumpWidget(MaterialApp(
      home: OrderInvitePage(token: 'invite-token', api: api),
    ));
    await tester.pumpAndSettle();

    for (final width in [320.0, 430.0, 768.0, 1440.0]) {
      tester.view.physicalSize = Size(width, 900);
      tester.view.devicePixelRatio = 1;
      await tester.pump();
      expect(tester.takeException(), isNull,
          reason: 'preview must not overflow at ${width.toInt()}px');
    }
    tester.view.resetPhysicalSize();
    tester.view.resetDevicePixelRatio();
    await tester.pump();

    expect(find.text('上車：中環'), findsOneWidget);
    expect(find.text('目的地：機場'), findsOneWidget);
    expect(find.text('接受邀請'), findsOneWidget);
    expect(find.text('確認訂單'), findsOneWidget);
    expect(find.text('預計收入'), findsOneWidget);
    expect(find.textContaining('乘客'), findsNothing);

    await tester.ensureVisible(find.text('接受邀請'));
    await tester.tap(find.text('接受邀請'));
    await tester.pumpAndSettle();

    expect(find.text('手機驗證'), findsNWidgets(2));
    expect(find.widgetWithText(TextField, '00000'), findsOneWidget);
    expect(find.text('獲取驗證碼'), findsOneWidget);
    expect(find.text('使用已登入正式司機身份接受'), findsOneWidget);
  });

  test('two-region plate fields follow formal registration ownership order',
      () {
    expect(orderInvitePlateLabels('香港', '兩地牌'), ['香港車牌', '內地車牌']);
    expect(orderInvitePlateLabels('中國內地', '兩地牌'), ['內地車牌', '香港車牌']);
  });

  test('cross-border mainland plate uses formal registration format', () {
    expect(composeMainlandPlate('ab123', '香港'), '粵Z·AB123港');
    expect(
      vehiclePlateError(
        vehicleOwnership: '香港',
        hongKongPlate: 'AB 1234',
        macauPlate: '',
        mainlandPlate: composeMainlandPlate('ab123', '香港'),
      ),
      isNull,
    );
    expect(
      vehiclePlateError(
        vehicleOwnership: '香港',
        hongKongPlate: 'AB 1234',
        macauPlate: '',
        mainlandPlate: '粵ZAB123港',
      ),
      '香港跨境車牌格式必須為粵Z·內容港，不可包含空格',
    );
  });

  test('local recognition only extracts supported registration fields', () {
    final result = LocalOrderInviteRecognitionAdapter().recognizeText('''
姓名：陳大文
香港車牌：AB 1234
內地車牌：粵Z123港
車輛顏色：白色
''');

    expect(result.name, '陳大文');
    expect(result.hkPlate, 'AB 1234');
    expect(result.mainlandPlate, '粵Z123港');
    expect(result.vehicleColor, '白色');
  });

  test('API client reports a non-JSON success response as an API error',
      () async {
    final api = OrderInviteApiClient(
      baseUrl: 'https://driver.test',
      client: MockClient((_) async => http.Response('not json', 200)),
    );

    await expectLater(
      api.details('invite-token'),
      throwsA(isA<OrderInviteApiException>()),
    );
  });
}

Map<String, dynamic> _tripResponse(
        {required bool arrived,
        required bool started,
        required bool completed,
        bool settled = false}) =>
    {
      'id': 'trip-1',
      'pickupAddress': '中環',
      'dropoffAddress': '機場',
      'scheduledAt': '2026-10-01T08:00:00.000Z',
      'passengerName': '陳小姐',
      'passengerGender': '女',
      'passengerPhoneCountryCode': '+852',
      'passengerPhone': '****5678',
      'passengerPhoneVisible': false,
      'price': 380,
      'currency': 'HKD',
      'canCancel': !started && !completed,
      'status': completed ? 'COMPLETED' : 'CONFIRMED',
      'arrivedAt': arrived ? '2026-10-01T08:05:00.000Z' : null,
      'startedAt': started ? '2026-10-01T08:10:00.000Z' : null,
      'completedAt': completed ? '2026-10-01T09:00:00.000Z' : null,
      'settlement': settled
          ? {
              'method': '微信支付：driver-wechat',
              'settledAt': '2026-10-01T09:01:00.000Z',
            }
          : null,
    };

class _MemorySessionStore implements OrderInviteSessionStore {
  final Map<String, String> values = {};

  @override
  String? read(String invitationId) => values[invitationId];

  @override
  void remove(String invitationId) => values.remove(invitationId);

  @override
  void write(String invitationId, String token) => values[invitationId] = token;
}
