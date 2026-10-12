import 'dart:convert';

import 'package:driver_web/core/api/driver_api_client.dart';
import 'package:driver_web/core/tokens/driver_tokens.dart';
import 'package:driver_web/main.dart' as driver_app;
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

void main() {
  tearDown(() => DriverApiClient.instance = DriverApiClient());

  testWidgets('application theme falls back to the SC supplement',
      (tester) async {
    DriverApiClient.instance = DriverApiClient(
      client: MockClient((request) async => http.Response(
            jsonEncode({'data': []}),
            200,
            headers: {'content-type': 'application/json'},
          )),
    );
    await driver_app.main();
    await tester.pump();
    final app = tester.widget<MaterialApp>(find.byType(MaterialApp));
    final style = app.theme!.textTheme.bodyMedium!;
    expect(style.fontFamily, DriverTypography.fontFamily);
    expect(style.fontFamilyFallback, DriverTypography.fontFamilyFallback);
  });
}
