import 'dart:async';
import 'dart:convert';

import 'package:driver_web/auth/login_page.dart';
import 'package:driver_web/core/api/driver_api_client.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

void main() {
  for (final outcome in ['enabled', 'disabled', 'failure']) {
    testWidgets('phone card configuration: $outcome', (tester) async {
      final original = DriverApiClient.instance;
      final pending = Completer<http.Response>();
      final requests = <String>[];
      DriverApiClient.instance = DriverApiClient(client: MockClient((request) {
        requests.add(request.url.path);
        return pending.future;
      }));
      addTearDown(() => DriverApiClient.instance = original);
      await tester.pumpWidget(const MaterialApp(home: LoginPage()));
      await tester.pump();
      expect(find.text('手機號碼'), findsOneWidget);
      expect(find.byType(TextField), findsNWidgets(2));
      for (final field
          in tester.widgetList<TextField>(find.byType(TextField))) {
        expect(field.enabled, false);
      }
      await tester.tap(find.text('獲取驗證碼'));
      await tester.tap(find.text('登入 / 註冊'));
      await tester.tap(find.text('+852'));
      await tester.pump();
      expect(find.byType(ListTile), findsNothing);
      expect(requests, ['/driver/auth/login-methods']);
      pending.complete(http.Response(
        jsonEncode(outcome == 'failure'
            ? {'message': 'Unavailable'}
            : {
                'data': outcome == 'enabled'
                    ? [
                        {'provider': 'phone'}
                      ]
                    : [
                        {'provider': 'wechat'}
                      ]
              }),
        outcome == 'failure' ? 503 : 200,
        headers: {'content-type': 'application/json; charset=utf-8'},
      ));
      await tester.pumpAndSettle();
      if (outcome == 'enabled') {
        expect(find.text('手機號碼'), findsOneWidget);
        for (final field
            in tester.widgetList<TextField>(find.byType(TextField))) {
          expect(field.enabled, true);
        }
        await tester.enterText(find.byType(TextField).first, '91234567');
        expect(
            tester
                .widget<TextField>(find.byType(TextField).first)
                .controller!
                .text,
            '91234567');
      } else {
        expect(find.byType(TextField), findsNothing);
        expect(find.text(outcome == 'failure' ? '無法載入登入方式，請稍後重試' : '請選擇其他登入方式'),
            findsOneWidget);
      }
      expect(tester.takeException(), isNull);
    });
  }
}
