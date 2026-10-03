import 'dart:convert';

import 'package:driver_web/auth/login_page.dart';
import 'package:driver_web/core/api/driver_api_client.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

void main() {
  for (final outcome in ['success', 'failure', 'navigation']) {
    final failure = outcome == 'failure';
    testWidgets('SMS cooldown: $outcome', (tester) async {
      final original = DriverApiClient.instance;
      var requests = 0;
      DriverApiClient.instance =
          DriverApiClient(client: MockClient((request) async {
        if (request.url.path.endsWith('login-methods')) {
          return http.Response(
              jsonEncode({
                'data': [
                  {'provider': 'phone'}
                ]
              }),
              200);
        }
        requests++;
        return http.Response(
            jsonEncode(failure
                ? {'message': 'Unavailable'}
                : {
                    'data': {'challengeId': 'test-challenge'}
                  }),
            failure ? 503 : 200);
      }));
      addTearDown(() => DriverApiClient.instance = original);
      await tester.pumpWidget(MaterialApp(
          theme: ThemeData(fontFamily: 'Noto Sans TC'),
          home: const LoginPage()));
      await tester.pumpAndSettle();
      await tester.enterText(find.byType(TextField).first, '91234567');
      await tester.tap(find.text('獲取驗證碼'));
      await tester.pump();
      await tester.pump();
      expect(requests, 1);
      if (failure) {
        expect(find.text('獲取驗證碼'), findsOneWidget);
        expect(find.text('驗證碼已發送'), findsNothing);
      } else {
        expect(find.text('60秒後重發'), findsOneWidget);
        expect(find.text('驗證碼已發送'), findsOneWidget);
        await tester.tap(find.text('60秒後重發'));
        expect(requests, 1);
        if (outcome == 'navigation') {
          final context = tester.element(find.byType(LoginPage));
          Navigator.of(context).push(MaterialPageRoute<void>(
              builder: (_) => const Scaffold(body: Text('Next page'))));
          await tester.pump();
          await tester.pump(const Duration(milliseconds: 100));
          expect(find.text('驗證碼已發送'), findsNothing);
          await tester.pumpWidget(const SizedBox.shrink());
          await tester.pump();
          expect(tester.takeException(), isNull);
          return;
        }
        await tester.pump(const Duration(seconds: 2));
        await tester.pump();
        expect(find.text('驗證碼已發送'), findsNothing);
        expect(find.text('58秒後重發'), findsOneWidget);
        await tester.pump(const Duration(seconds: 58));
        expect(find.text('獲取驗證碼'), findsOneWidget);
        await tester.tap(find.text('獲取驗證碼'));
        await tester.pump();
        await tester.pump();
        expect(requests, 2);
      }
      await tester.pumpWidget(const SizedBox.shrink());
      await tester.pump();
      expect(tester.takeException(), isNull);
    });
  }
}
