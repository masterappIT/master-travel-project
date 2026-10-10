import 'package:driver_web/contact_support_page.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  for (final width in [320.0, 430.0, 768.0, 1440.0]) {
    testWidgets('support UI fits a ${width.toInt()}px viewport', (tester) async {
      tester.view.physicalSize = Size(width, 932);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      await tester.pumpWidget(const MaterialApp(home: ContactSupportPage()));
      await tester.pumpAndSettle();

      expect(find.text('客服服務尚未接通'), findsOneWidget);
      expect(find.text('圖片'), findsOneWidget);
      expect(find.text('影片'), findsOneWidget);
      expect(find.text('語音訊息'), findsOneWidget);
      expect(find.text('語音通話'), findsOneWidget);
      expect(tester.takeException(), isNull);
    });
  }

  testWidgets('trip entry shows context without enabling message actions', (tester) async {
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
    expect(tester.widget<TextField>(find.byType(TextField)).enabled, isFalse);
    expect(tester.widget<FilledButton>(find.byType(FilledButton)).onPressed, isNull);
    expect(tester.takeException(), isNull);
  });
}
