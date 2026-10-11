import 'package:driver_web/contact_support_page.dart';
import 'package:driver_web/core/api/driver_api_client.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'dart:convert';
import 'dart:async';

void main() {
  setUp(() {
    final original = DriverApiClient.instance;
    DriverApiClient.instance =
        DriverApiClient(client: MockClient((request) async {
      if (request.url.path.endsWith('/mine')) {
        return http.Response(jsonEncode({'id': 'conversation-1'}), 200);
      }
      if (request.url.path.endsWith('/messages') && request.method == 'GET') {
        return http.Response(jsonEncode({'data': []}), 200);
      }
      if (request.url.path.endsWith('/messages') && request.method == 'POST') {
        return http.Response(jsonEncode({'id': 'message-1'}), 200);
      }
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

      expect(find.text('聯繫客服'), findsOneWidget);
      expect(find.text('您好，有甚麼可以幫您？'), findsOneWidget);
      expect(find.text('圖片'), findsOneWidget);
      expect(find.text('影片'), findsNothing);
      expect(find.text('語音訊息'), findsNothing);
      expect(find.text('語音通話'), findsNothing);
      final viewportHeight = tester.view.physicalSize.height;
      final inputBottom = tester.getBottomLeft(find.byType(TextField)).dy;
      expect(inputBottom, lessThan(viewportHeight));
      expect(inputBottom, greaterThan(viewportHeight / 2));
      expect(tester.takeException(), isNull);
    });
  }

  testWidgets('trip entry shows context with text actions', (tester) async {
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
    expect(find.text('關於此訂單／行程 · 行程進行中'), findsOneWidget);
    expect(tester.widget<TextField>(find.byType(TextField)).enabled, isTrue);
    expect(tester.widget<FilledButton>(find.byType(FilledButton)).onPressed,
        isNull);
    await tester.enterText(find.byType(TextField), '請協助查看行程');
    await tester.pump();
    expect(tester.widget<FilledButton>(find.byType(FilledButton)).onPressed,
        isNotNull);
    expect(tester.takeException(), isNull);
  });

  testWidgets('older poll cannot replace messages from a newer poll',
      (tester) async {
    final stalePoll = Completer<http.Response>();
    var messageReads = 0;
    final original = DriverApiClient.instance;
    DriverApiClient.instance =
        DriverApiClient(client: MockClient((request) async {
      if (request.url.path.endsWith('/mine')) {
        return http.Response(jsonEncode({'id': 'conversation-1'}), 200);
      }
      if (request.url.path.endsWith('/messages') && request.method == 'GET') {
        messageReads++;
        if (messageReads == 2) return stalePoll.future;
        return http.Response(
            jsonEncode({
              'data': messageReads >= 3
                  ? [
                      {'id': 'message-1', 'text': '新訊息', 'senderType': 'DRIVER'}
                    ]
                  : []
            }),
            200,
            headers: {'content-type': 'application/json; charset=utf-8'});
      }
      if (request.url.path.endsWith('/messages') && request.method == 'POST') {
        return http.Response(jsonEncode({'id': 'message-1'}), 200);
      }
      return http.Response('{}', 404);
    }));
    addTearDown(() => DriverApiClient.instance = original);

    await tester.pumpWidget(const MaterialApp(home: ContactSupportPage()));
    await tester.pump();
    await tester.pump(const Duration(seconds: 5));
    expect(messageReads, 2);
    await tester.pump(const Duration(seconds: 5));
    await tester.pump();
    expect(messageReads, 3);
    await tester
        .runAsync(() => Future<void>.delayed(const Duration(milliseconds: 50)));
    await tester.pump();
    expect(find.text('新訊息', skipOffstage: false), findsOneWidget);
    expect(find.text('我', skipOffstage: false), findsOneWidget);
    expect(find.text('DRIVER', skipOffstage: false), findsNothing);

    stalePoll.complete(http.Response(jsonEncode({'data': []}), 200,
        headers: {'content-type': 'application/json; charset=utf-8'}));
    await tester.pump();
    expect(find.text('新訊息', skipOffstage: false), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('support messages render as opposing bubbles', (tester) async {
    tester.view.physicalSize = const Size(430, 932);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    final original = DriverApiClient.instance;
    DriverApiClient.instance =
        DriverApiClient(client: MockClient((request) async {
      if (request.url.path.endsWith('/mine')) {
        return http.Response(jsonEncode({'id': 'conversation-1'}), 200);
      }
      return http.Response(
          jsonEncode({
            'data': [
              {
                'id': 'agent-message',
                'text': '您好',
                'senderType': 'ADMIN',
                'createdAt': '2026-10-10T23:08:00+08:00',
              },
              {
                'id': 'driver-message',
                'text': '請協助查看',
                'senderType': 'DRIVER',
                'createdAt': '2026-10-10T23:09:00+08:00',
              },
            ]
          }),
          200,
          headers: {'content-type': 'application/json; charset=utf-8'});
    }));
    addTearDown(() => DriverApiClient.instance = original);

    await tester.pumpWidget(const MaterialApp(home: ContactSupportPage()));
    await tester.pumpAndSettle();

    final agentBubble = find.ancestor(
      of: find.text('您好'),
      matching: find.byWidgetPredicate((widget) =>
          widget is Align && widget.alignment == Alignment.centerLeft),
    );
    final driverBubble = find.ancestor(
      of: find.text('請協助查看'),
      matching: find.byWidgetPredicate((widget) =>
          widget is Align && widget.alignment == Alignment.centerRight),
    );
    expect(agentBubble, findsOneWidget);
    expect(driverBubble, findsOneWidget);
    final agentCard = find
        .ancestor(
          of: find.text('您好'),
          matching: find.byType(DecoratedBox),
        )
        .first;
    final driverCard = find
        .ancestor(
          of: find.text('請協助查看'),
          matching: find.byType(DecoratedBox),
        )
        .first;
    expect(tester.getTopLeft(agentCard).dx,
        lessThan(tester.getTopLeft(driverCard).dx));
    expect(tester.getSize(agentCard).width, lessThan(260));
    expect(tester.getSize(driverCard).width, lessThan(260));
    expect(find.text('客服'), findsOneWidget);
    expect(find.text('我'), findsOneWidget);
    final firstLocalTime =
        DateTime.parse('2026-10-10T23:08:00+08:00').toLocal();
    final secondLocalTime =
        DateTime.parse('2026-10-10T23:09:00+08:00').toLocal();
    String label(DateTime value) =>
        '${value.month.toString().padLeft(2, '0')}/${value.day.toString().padLeft(2, '0')} '
        '${value.hour.toString().padLeft(2, '0')}:${value.minute.toString().padLeft(2, '0')}';
    expect(find.text(label(firstLocalTime)), findsOneWidget);
    expect(find.text(label(secondLocalTime)), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('send posts a valid id and shows the driver message',
      (tester) async {
    String? sentText;
    String? sentId;
    final original = DriverApiClient.instance;
    DriverApiClient.instance =
        DriverApiClient(client: MockClient((request) async {
      if (request.url.path.endsWith('/mine')) {
        return http.Response(jsonEncode({'id': 'conversation-1'}), 200);
      }
      if (request.method == 'POST' && request.url.path.endsWith('/messages')) {
        final body = jsonDecode(request.body) as Map<String, dynamic>;
        sentText = body['text'] as String;
        sentId = body['clientMessageId'] as String;
        return http.Response(jsonEncode({'id': 'message-1'}), 200);
      }
      return http.Response(
          jsonEncode({
            'data': sentText == null
                ? []
                : [
                    {
                      'id': 'message-1',
                      'text': sentText,
                      'senderType': 'DRIVER'
                    }
                  ]
          }),
          200,
          headers: {'content-type': 'application/json; charset=utf-8'});
    }));
    addTearDown(() => DriverApiClient.instance = original);

    await tester.pumpWidget(const MaterialApp(home: ContactSupportPage()));
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField), '  請協助查看行程  ');
    await tester.pump();
    await tester.tap(find.text('發送'));
    await tester.pumpAndSettle();

    expect(sentText, '請協助查看行程');
    expect(sentId, matches(RegExp(r'^m[A-Za-z0-9_-]{8,79}$')));
    expect(find.text('請協助查看行程', skipOffstage: false), findsOneWidget);
    expect(tester.widget<TextField>(find.byType(TextField)).controller!.text,
        isEmpty);
    expect(find.text('發送中…'), findsNothing);
    expect(tester.takeException(), isNull);
  });

  testWidgets('failed send keeps the draft and reuses its id on retry',
      (tester) async {
    final sentIds = <String>[];
    var attempts = 0;
    final original = DriverApiClient.instance;
    DriverApiClient.instance =
        DriverApiClient(client: MockClient((request) async {
      if (request.url.path.endsWith('/mine')) {
        return http.Response(jsonEncode({'id': 'conversation-1'}), 200);
      }
      if (request.method == 'POST' && request.url.path.endsWith('/messages')) {
        attempts++;
        sentIds.add((jsonDecode(request.body)
            as Map<String, dynamic>)['clientMessageId'] as String);
        return attempts == 1
            ? http.Response(jsonEncode({'message': '暫時無法發送'}), 503)
            : http.Response(jsonEncode({'id': 'message-1'}), 200);
      }
      return http.Response(jsonEncode({'data': []}), 200);
    }));
    addTearDown(() => DriverApiClient.instance = original);

    await tester.pumpWidget(const MaterialApp(home: ContactSupportPage()));
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField), '請協助查看行程');
    await tester.pump();
    await tester.tap(find.text('發送'));
    await tester.pumpAndSettle();

    expect(attempts, 1);
    expect(tester.widget<TextField>(find.byType(TextField)).controller!.text,
        '請協助查看行程');
    expect(find.text('發送中…'), findsNothing);

    await tester.tap(find.text('發送'));
    await tester.pumpAndSettle();
    expect(attempts, 2);
    expect(sentIds[1], sentIds[0]);
    expect(tester.widget<TextField>(find.byType(TextField)).controller!.text,
        isEmpty);
    expect(tester.takeException(), isNull);
  });
}
