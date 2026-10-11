import 'dart:async';
import 'dart:convert';

import 'package:driver_web/app/route_names.dart';
import 'package:driver_web/app/router.dart';
import 'package:driver_web/core/api/driver_api_client.dart';
import 'package:driver_web/core/platform/browser_storage.dart';
import 'package:driver_web/core/state/driver_currency_initialization.dart';
import 'package:driver_web/core/state/driver_currency_preference.dart';
import 'package:driver_web/main.dart' as driver_app;
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

http.Response response(Object body) => http.Response(
      jsonEncode(body),
      200,
      headers: {'content-type': 'application/json'},
    );

void main() {
  setUp(() {
    removeBrowserValue('driver_session_token');
    removeBrowserValue('driver_currency_preference');
    DriverCurrencyInitialization.resetForTesting();
    DriverApiClient.instance = DriverApiClient();
  });

  tearDown(() {
    removeBrowserValue('driver_session_token');
    removeBrowserValue('driver_currency_preference');
    DriverCurrencyInitialization.resetForTesting();
    DriverApiClient.instance = DriverApiClient();
  });

  testWidgets('login renders without waiting for currency settings',
      (tester) async {
    final paths = <String>[];
    final settings = Completer<http.Response>();
    DriverApiClient.instance = DriverApiClient(
      client: MockClient((request) {
        paths.add(request.url.path);
        if (request.url.path == '/settings') return settings.future;
        return Future.value(response({'data': []}));
      }),
    );

    await driver_app.main();
    await tester.pump();
    expect(find.text('登入 / 註冊'), findsOneWidget);
    expect(paths.where((path) => path == '/settings').length, 1);
    settings.complete(response({'driverDefaultCurrency': 'RMB'}));
    await tester.pump();
  });

  testWidgets('approved home waits for currency before requesting statistics',
      (tester) async {
    writeBrowserValue('driver_session_token', 'test-token');
    removeBrowserValue('driver_currency_preference');
    final settings = Completer<http.Response>();
    final paths = <String>[];
    DriverApiClient.instance = DriverApiClient(
      client: MockClient((request) {
        paths.add(request.url.path);
        if (request.url.path == '/settings') return settings.future;
        if (request.url.path == '/driver/auth/me') {
          return Future.value(response({
            'driver': {'reviewStatus': 'APPROVED', 'name': 'Test Driver'}
          }));
        }
        if (request.url.path == '/driver/auth/vehicles') {
          return Future.value(response({'data': []}));
        }
        if (request.url.path == '/driver/auth/statistics') {
          return Future.value(response({
            'today': {'earnings': 0, 'currency': 'HKD'},
            'month': {'earnings': 0, 'currency': 'HKD'},
          }));
        }
        return Future.value(response({'data': []}));
      }),
    );

    await DriverApiClient.instance.me();
    await tester.pumpWidget(
        const driver_app.DriverApp(initialRoute: DriverRouteNames.home));
    await tester.pump();
    expect(find.text('登入 / 註冊'), findsNothing);
    expect(paths, contains('/settings'));
    expect(paths, isNot(contains('/driver/auth/statistics')));

    settings.complete(response({'driverDefaultCurrency': 'HKD'}));
    await tester.pump();
    await tester.pump();
    expect(DriverCurrencyPreference.instance.code, 'HKD');
    expect(paths, contains('/driver/auth/statistics'));
    expect(paths.where((path) => path == '/driver/auth/statistics').length, 1);
    expect(paths.where((path) => path == '/driver/auth/me').length, 1);
  });

  testWidgets('stored currency enters home without settings', (tester) async {
    writeBrowserValue('driver_session_token', 'test-token');
    writeBrowserValue('driver_currency_preference', 'HKD');
    final paths = <String>[];
    DriverApiClient.instance = DriverApiClient(
      client: MockClient((request) async {
        paths.add(request.url.path);
        if (request.url.path == '/driver/auth/me') {
          return response({
            'driver': {'reviewStatus': 'APPROVED', 'name': 'Test Driver'}
          });
        }
        if (request.url.path == '/driver/auth/vehicles') {
          return response({'data': []});
        }
        return response({'data': []});
      }),
    );

    await DriverApiClient.instance.me();
    await tester.pumpWidget(
        const driver_app.DriverApp(initialRoute: DriverRouteNames.home));
    await tester.pump();
    await tester.pump();
    expect(paths, isNot(contains('/settings')));
    expect(paths, contains('/driver/auth/statistics'));
  });

  testWidgets('stored currency is not replaced by background settings',
      (tester) async {
    writeBrowserValue('driver_currency_preference', 'HKD');
    final paths = <String>[];
    DriverApiClient.instance = DriverApiClient(
      client: MockClient((request) async {
        paths.add(request.url.path);
        return response({'data': []});
      }),
    );

    await driver_app.main();
    await tester.pump();
    expect(DriverCurrencyPreference.instance.code, 'HKD');
    expect(paths, isNot(contains('/settings')));
  });

  testWidgets('stored session waits for validation before opening home',
      (tester) async {
    writeBrowserValue('driver_session_token', 'test-token');
    writeBrowserValue('driver_currency_preference', 'HKD');
    final validation = Completer<http.Response>();
    final paths = <String>[];
    DriverApiClient.instance = DriverApiClient(
      client: MockClient((request) {
        paths.add(request.url.path);
        if (request.url.path == '/driver/auth/me') return validation.future;
        if (request.url.path == '/driver/auth/vehicles') {
          return Future.value(response({'data': []}));
        }
        return Future.value(response({'data': []}));
      }),
    );

    await driver_app.main();
    await tester.pump();
    expect(paths.where((path) => path == '/driver/auth/me').length, 1);
    expect(paths, isNot(contains('/driver/auth/vehicles')));
    expect(find.text('工作台總覽'), findsNothing);

    validation.complete(response({
      'driver': {'reviewStatus': 'APPROVED', 'name': 'Test Driver'}
    }));
    await tester.pump();
    await tester.pump();
    expect(find.text('工作台總覽'), findsOneWidget);
    expect(paths.where((path) => path == '/driver/auth/me').length, 1);
  });

  testWidgets('failed settings request is shared across approved routes',
      (tester) async {
    writeBrowserValue('driver_session_token', 'test-token');
    final paths = <String>[];
    DriverApiClient.instance = DriverApiClient(
      client: MockClient((request) async {
        paths.add(request.url.path);
        if (request.url.path == '/driver/auth/me') {
          return response({
            'driver': {'reviewStatus': 'APPROVED', 'name': 'Test Driver'}
          });
        }
        if (request.url.path == '/settings') {
          return http.Response('unavailable', 503);
        }
        if (request.url.path == '/driver/auth/trips/active' ||
            request.url.path == '/driver/auth/trips/available') {
          return response([]);
        }
        return response({'data': []});
      }),
    );

    await DriverApiClient.instance.me();
    await tester.pumpWidget(
        const driver_app.DriverApp(initialRoute: DriverRouteNames.home));
    await tester.pump();
    await tester.pump();
    expect(paths.where((path) => path == '/settings').length, 1);

    await tester.pumpWidget(const SizedBox.shrink());
    await tester.pumpWidget(MaterialApp(
        home: Builder(
      builder: DriverRouter.builders[DriverRouteNames.orders]!,
    )));
    await tester.pumpAndSettle();
    expect(paths.where((path) => path == '/settings').length, 1);
  });
}
