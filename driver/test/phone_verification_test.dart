import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:driver_web/driver_phone_verification_dialog.dart';

void main() {
  testWidgets('phone verification validates and submits the new phone code',
      (tester) async {
    String? submitted;
    await tester.pumpWidget(MaterialApp(
        home: Scaffold(
            body: DriverPhoneVerificationDialog(
      phone: '+852 60000000',
      resend: () async {},
      verify: (code) async {
        submitted = code;
      },
    ))));
    await tester.tap(find.text('確認驗證'));
    await tester.pump();
    expect(find.text('請輸入 5 位驗證碼'), findsOneWidget);
    expect(submitted, isNull);
    await tester.enterText(find.byType(TextField), '54321');
    await tester.tap(find.text('確認驗證'));
    await tester.pump();
    expect(submitted, '54321');
    await tester.pumpWidget(const SizedBox());
  });

  testWidgets('resend waits 60 seconds and restarts only after success',
      (tester) async {
    var requests = 0;
    var fail = true;
    await tester.pumpWidget(MaterialApp(
        home: Scaffold(
            body: DriverPhoneVerificationDialog(
      phone: '+852 60000000',
      verify: (_) async {},
      resend: () async {
        requests++;
        if (fail) throw Exception('Resend failed');
      },
    ))));
    expect(find.text('60 秒後可重新獲取'), findsOneWidget);
    await tester.tap(find.text('60 秒後可重新獲取'));
    expect(requests, 0);
    await tester.pump(const Duration(seconds: 59));
    expect(find.text('1 秒後可重新獲取'), findsOneWidget);
    await tester.pump(const Duration(seconds: 1));
    await tester.tap(find.text('重新獲取驗證碼'));
    await tester.pump();
    expect(requests, 1);
    expect(find.textContaining('Resend failed'), findsOneWidget);
    expect(find.text('重新獲取驗證碼'), findsOneWidget);
    fail = false;
    await tester.enterText(find.byType(TextField), '54321');
    await tester.tap(find.text('重新獲取驗證碼'));
    await tester.pump();
    expect(requests, 2);
    expect(find.text('60 秒後可重新獲取'), findsOneWidget);
    expect(tester.widget<TextField>(find.byType(TextField)).controller!.text,
        isEmpty);
    await tester.pumpWidget(const SizedBox());
  });

  testWidgets('failed verification leaves the dialog open for retry',
      (tester) async {
    await tester.pumpWidget(MaterialApp(
        home: Scaffold(
            body: DriverPhoneVerificationDialog(
      phone: '+86 13800138000',
      resend: () async {},
      verify: (_) async {
        throw Exception('Invalid verification code');
      },
    ))));
    await tester.enterText(find.byType(TextField), '00000');
    await tester.tap(find.text('確認驗證'));
    await tester.pump();
    expect(find.textContaining('Invalid verification code'), findsOneWidget);
    expect(find.text('確認驗證'), findsOneWidget);
  });
}
