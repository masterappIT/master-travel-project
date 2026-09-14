import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:driver_web/home_page.dart';
import 'package:driver_web/main.dart';
import 'package:driver_web/order_completed_page.dart';
import 'package:driver_web/order_hall_page.dart';
import 'package:driver_web/order_history_page.dart';
import 'package:driver_web/order_in_progress_page.dart';

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
    expect(find.text('香港中環置地廣場東門大堂'), findsOneWidget);
    expect(find.text('深圳福田口岸'), findsOneWidget);
    expect(find.text('暫無成功接單'), findsNothing);

    await tester.tap(find.text('成功接單'));
    await tester.pump();

    expect(find.text('暫無成功接單'), findsOneWidget);
    expect(find.text('香港中環置地廣場東門大堂'), findsNothing);
    expect(find.text('深圳福田口岸'), findsNothing);
  });
  testWidgets('opens order details and selects a vehicle',
      (WidgetTester tester) async {
    await tester.pumpWidget(const MaterialApp(home: OrderHallPage()));

    await tester.tap(find.text('陳大文'));
    await tester.pumpAndSettle();

    expect(find.text('訂單詳情'), findsOneWidget);
    expect(find.text('請確認乘客資訊與行程內容'), findsOneWidget);
    expect(find.text('確認接單'), findsOneWidget);
    expect(find.text('車輛 1'), findsOneWidget);
    expect(find.text('AB 1234'), findsOneWidget);

    await tester.ensureVisible(find.text('車輛 2').first);
    await tester.tap(find.text('車輛 2').first);
    await tester.pump();
    await tester.ensureVisible(find.text('確認接單'));
    await tester.tap(find.text('確認接單'));
    await tester.pumpAndSettle();

    expect(find.text('成功接單'), findsOneWidget);
    expect(find.text('車資'), findsOneWidget);
    expect(find.text('\$280.00'), findsOneWidget);
    expect(find.text('車輛顏色'), findsOneWidget);
    expect(find.text('白色'), findsOneWidget);
  });

  testWidgets('renders in-progress order page content',
      (WidgetTester tester) async {
    await tester.pumpWidget(const MaterialApp(home: OrderInProgressPage()));

    expect(find.text('進行中'), findsNWidgets(2));
    expect(find.text('香港中環 → 深圳'), findsOneWidget);
    expect(find.text('陳'), findsOneWidget);
    expect(find.text('陳大文'), findsNWidgets(2));
    expect(find.text('出發地'), findsOneWidget);
    expect(find.text('目的地'), findsOneWidget);
    expect(find.text('出發時間'), findsOneWidget);
    expect(find.text('乘客'), findsOneWidget);
    expect(find.text('車資'), findsOneWidget);
    expect(find.text('\$280.00'), findsOneWidget);
    expect(find.text('完成'), findsOneWidget);
  });

  testWidgets('opens completed page from in-progress action',
      (WidgetTester tester) async {
    await tester.pumpWidget(const MaterialApp(home: OrderInProgressPage()));

    await tester.ensureVisible(find.text('完成'));
    await tester.tap(find.text('完成'));
    await tester.pumpAndSettle();

    expect(find.text('行程已抵達目的地'), findsOneWidget);
    expect(find.text('確認完成'), findsOneWidget);
  });

  testWidgets('renders order history page content',
      (WidgetTester tester) async {
    await tester.pumpWidget(const MaterialApp(home: OrderHistoryPage()));

    expect(find.text('接單紀錄'), findsOneWidget);
    expect(find.text('已結算'), findsNWidgets(3));
    expect(find.text('未結算'), findsNWidgets(3));
    expect(find.text('2024年3月'), findsOneWidget);
    expect(find.text('出發：香港中環'), findsOneWidget);
    expect(find.text('目的：深圳'), findsOneWidget);
    expect(find.text('\$680.00'), findsOneWidget);

    await tester.tap(find.text('未結算').first);
    await tester.pump();
    expect(find.text('接單紀錄'), findsOneWidget);
  });

  testWidgets('opens order history from profile menu',
      (WidgetTester tester) async {
    await tester.pumpWidget(const MaterialApp(home: ProfilePage()));

    await tester.ensureVisible(find.text('接單紀錄'));
    await tester.tap(find.text('接單紀錄'));
    await tester.pumpAndSettle();

    expect(find.text('2024年3月'), findsOneWidget);
    expect(find.text('出發：香港中環'), findsOneWidget);
  });

  testWidgets('navigates from order history to order hall',
      (WidgetTester tester) async {
    await tester.pumpWidget(const MaterialApp(home: OrderHistoryPage()));

    await tester.tap(find.text('接單').last);
    await tester.pumpAndSettle();

    expect(find.text('接單大廳'), findsOneWidget);
  });

  testWidgets('renders completed order page content',
      (WidgetTester tester) async {
    await tester.pumpWidget(const MaterialApp(home: OrderCompletedPage()));

    expect(find.text('行程已抵達目的地'), findsOneWidget);
    expect(find.text('請與乘客確認車資並完成收款'), findsOneWidget);
    expect(find.text('城市天際線預覽'), findsOneWidget);
    expect(find.text('訂單詳情'), findsOneWidget);
    expect(find.text('車資明細'), findsOneWidget);
    expect(find.text('起步價'), findsOneWidget);
    expect(find.text('里程費 (6.4 km × \$15)'), findsOneWidget);
    expect(find.text('時間費 (19.5 分鐘 × \$2.5)'), findsOneWidget);
    expect(find.text('總計應收'), findsOneWidget);
    expect(find.text('\$280.00'), findsOneWidget);
    expect(find.text('確認完成'), findsOneWidget);

    await tester.ensureVisible(find.text('確認完成'));
    await tester.tap(find.text('確認完成'));
    await tester.pumpAndSettle();

    expect(find.text('接單大廳'), findsOneWidget);
    expect(find.text('可接單'), findsOneWidget);
  });
}
