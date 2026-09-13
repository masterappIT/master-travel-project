import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:driver_web/home_page.dart';
import 'package:driver_web/main.dart';
import 'package:driver_web/order_hall_page.dart';

import 'package:driver_web/profile_page.dart';
import 'package:driver_web/registration_page.dart';

void main() {
  testWidgets('renders the driver login page', (WidgetTester tester) async {
    await tester.pumpWidget(const DriverApp());

    expect(find.text('跨境出行'), findsOneWidget);
    expect(find.text('司機端登入 / 註冊'), findsOneWidget);
    expect(find.text('登入 / 註冊'), findsOneWidget);
  });

  testWidgets('uses mainland and Hong Kong plates for mainland ownership',
      (WidgetTester tester) async {
    await tester.pumpWidget(const MaterialApp(home: RegistrationPage()));

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
    await tester.pumpWidget(const MaterialApp(home: RegistrationPage()));

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

  testWidgets('renders the driver home page and toggles online status',
      (WidgetTester tester) async {
    await tester.pumpWidget(const MaterialApp(home: HomePage()));

    expect(find.text('陳大文'), findsOneWidget);
    expect(find.text('今日收入'), findsOneWidget);
    expect(find.text('目前狀態：在線接單'), findsOneWidget);
    expect(find.text('首頁'), findsOneWidget);

    await tester.tap(find.text('目前狀態：在線接單'));
    await tester.pump();

    expect(find.text('目前狀態：離線'), findsOneWidget);
  });

  testWidgets('renders the driver profile page and navigation',
      (WidgetTester tester) async {
    await tester.pumpWidget(const MaterialApp(home: ProfilePage()));

    expect(find.text('陳大文'), findsOneWidget);
    expect(find.text('結算概覽'), findsOneWidget);
    expect(find.text('個人資料'), findsOneWidget);
    expect(find.text('登出帳號'), findsOneWidget);
    expect(find.text('我的'), findsOneWidget);
  });

  testWidgets('switches between available and accepted orders',
      (WidgetTester tester) async {
    await tester.pumpWidget(const MaterialApp(home: OrderHallPage()));

    expect(find.text('接單大廳'), findsOneWidget);
    expect(find.text('線上接單中'), findsOneWidget);
    expect(find.text('香港中環'), findsOneWidget);
    expect(find.text('香港機場'), findsOneWidget);
    expect(find.text('暫無成功接單'), findsNothing);

    await tester.tap(find.text('成功接單'));
    await tester.pump();

    expect(find.text('暫無成功接單'), findsOneWidget);
    expect(find.text('香港中環'), findsNothing);
    expect(find.text('香港機場'), findsNothing);
  });
  testWidgets('opens order details and selects a vehicle',
      (WidgetTester tester) async {
    await tester.pumpWidget(const MaterialApp(home: OrderHallPage()));

    await tester.tap(find.text('接單').first);
    await tester.pumpAndSettle();

    expect(find.text('訂單詳情'), findsOneWidget);
    expect(find.text('請確認乘客資訊與行程內容'), findsOneWidget);
    expect(find.text('確認接單'), findsOneWidget);
    expect(find.text('車輛 1'), findsOneWidget);
    expect(find.text('AB 1234'), findsOneWidget);

    await tester.tap(find.text('車輛 2').first);
    await tester.pump();
    expect(find.text('車輛 2'), findsOneWidget);
    expect(find.text('CD 5678'), findsOneWidget);
  });
}
