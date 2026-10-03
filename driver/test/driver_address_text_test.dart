import 'package:driver_web/core/state/driver_language_preference.dart';
import 'package:driver_web/core/widgets/driver_address_text.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('normalizes mixed Chinese addresses without changing Latin text', () {
    const traditional = DriverLanguagePreference.traditionalChinese;
    const simplified = DriverLanguagePreference.simplifiedChinese;
    expect(formatDriverAddress('中西区美利大厦', traditional), '中西區美利大廈');
    expect(formatDriverAddress('中西區美利大廈', simplified), '中西区美利大厦');
    expect(formatDriverAddress('佛山 · 禅城区佛山市', traditional), '佛山 · 禪城區佛山市');
    expect(formatDriverAddress('中西區美利大厦 · 22/F ABC 123', traditional),
        '中西區美利大廈 · 22/F ABC 123');
    expect(formatDriverAddress('中西區美利大厦', DriverLanguagePreference.english),
        '中西區美利大厦');
    expect(formatDriverAddress('', traditional), '');
  });

  testWidgets('updates addresses when language changes and retains text layout',
      (tester) async {
    final preference = DriverLanguagePreference.instance;
    final previous = preference.value;
    addTearDown(() => preference.select(previous));
    preference.select(DriverLanguagePreference.traditionalChinese);
    const raw = '中西区美利大厦';
    await tester.pumpWidget(const MaterialApp(
      home: Scaffold(
          body: DriverAddressText(raw,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(fontSize: 15))),
    ));
    expect(find.text('中西區美利大廈'), findsOneWidget);
    final text = tester.widget<Text>(find.text('中西區美利大廈'));
    expect(text.maxLines, 2);
    expect(text.overflow, TextOverflow.ellipsis);
    expect(text.style?.fontSize, 15);
    preference.select(DriverLanguagePreference.simplifiedChinese);
    await tester.pump();
    expect(find.text(raw), findsOneWidget);
    preference.select(DriverLanguagePreference.english);
    await tester.pump();
    expect(find.text(raw), findsOneWidget);
  });
}
