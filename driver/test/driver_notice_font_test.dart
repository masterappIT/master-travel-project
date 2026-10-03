import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:driver_web/core/widgets/driver_overlays.dart';

void main() {
  testWidgets('verification notice uses application font in root overlay',
      (tester) async {
    await tester.pumpWidget(MaterialApp(
      theme: ThemeData(fontFamily: 'Noto Sans TC'),
      home: Scaffold(
        body: Builder(
          builder: (context) => TextButton(
            onPressed: () => showDriverNotice(context, '驗證碼已發送'),
            child: const Text('Show notice'),
          ),
        ),
      ),
    ));
    await tester.tap(find.text('Show notice'));
    await tester.pump();
    final text = tester.widget<Text>(find.text('驗證碼已發送'));
    final element = tester.element(find.text('驗證碼已發送'));
    final effective = DefaultTextStyle.of(element).style.merge(text.style);
    expect(effective.fontFamily, 'Noto Sans TC');
    expect(effective.fontWeight, FontWeight.w700);
    expect(effective.decoration, TextDecoration.none);
    await tester.pump(const Duration(seconds: 3));
    expect(find.text('驗證碼已發送'), findsNothing);
  });
}
