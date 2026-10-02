import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:driver_web/driver_profile_page.dart';

void main() {
  testWidgets('region changes require edit mode and cancel restores readonly',
      (tester) async {
    await tester.pumpWidget(const MaterialApp(
      home: DriverProfilePage(
        initialName: 'Test Driver',
        initialHongKongMacauPhone: '+852 60000000',
      ),
    ));
    await tester.tap(find.text('香港 +852'));
    await tester.pumpAndSettle();
    expect(find.text('選擇區號'), findsNothing);
    await tester.tap(find.byKey(const ValueKey('driver-profile-edit')));
    await tester.pumpAndSettle();
    await tester.tap(find.text('香港 +852'));
    await tester.pumpAndSettle();
    expect(find.text('選擇區號'), findsOneWidget);
    await tester.tap(find.text('澳門 +853'));
    await tester.pumpAndSettle();
    expect(find.text('澳門 +853'), findsOneWidget);
    await tester.ensureVisible(find.text('取消'));
    await tester.tap(find.text('取消'));
    await tester.pumpAndSettle();
    expect(find.text('香港 +852'), findsOneWidget);
    await tester.ensureVisible(find.text('香港 +852'));
    await tester.tap(find.text('香港 +852'));
    await tester.pumpAndSettle();
    expect(find.text('選擇區號'), findsNothing);
  });
}
