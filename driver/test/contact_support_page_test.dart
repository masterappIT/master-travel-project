import 'package:driver_web/contact_support_page.dart';
import 'package:driver_web/core/api/driver_api_client.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'dart:convert';

void main() {
  setUp(() {
    final original = DriverApiClient.instance;
    DriverApiClient.instance = DriverApiClient(client: MockClient((request) async {
      if (request.url.path.endsWith('/mine')) return http.Response(jsonEncode({'id': 'conversation-1'}), 200);
      if (request.url.path.endsWith('/messages') && request.method == 'GET') return http.Response(jsonEncode({'data': []}), 200);
      if (request.url.path.endsWith('/messages') && request.method == 'POST') return http.Response(jsonEncode({'id': 'message-1'}), 200);
      return http.Response('{}', 404);
    }));
    addTearDown(() => DriverApiClient.instance = original);
  });
  for (final width in [320.0, 430.0, 768.0, 1440.0]) {
    testWidgets('support UI fits a ${width.toInt()}px viewport',
        (tester) async {
      tester.view.physicalSize = Size(width, 932);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      await tester.pumpWidget(const MaterialApp(home: ContactSupportPage()));
      await tester.pumpAndSettle();

      expect(find.text('客服文字對話'), findsOneWidget);
      expect(find.text('圖片'), findsOneWidget);
      expect(find.text('影片'), findsNothing);
      expect(find.text('語音訊息'), findsNothing);
      expect(find.text('語音通話'), findsNothing);
      expect(tester.takeException(), isNull);
    });
  }

  testWidgets('trip entry shows context with text actions',
      (tester) async {
    tester.view.physicalSize = const Size(430, 932);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(const MaterialApp(
      home: ContactSupportPage(
        trip: DriverSupportContext(
          tripId: 'trip-123',
          statusLabel: '行程進行中',
        ),
      ),
    ));
    await tester.pumpAndSettle();

    expect(find.text('訂單 ID：trip-123'), findsOneWidget);
    expect(find.text('行程進行中'), findsOneWidget);
    expect(tester.widget<TextField>(find.byType(TextField)).enabled, isTrue);
    expect(tester.widget<FilledButton>(find.byType(FilledButton)).onPressed,
        isNotNull);
    expect(tester.takeException(), isNull);
  });
}
