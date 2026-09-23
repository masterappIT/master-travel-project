import 'package:driver_web/core/formatters/passenger_name.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('formatPassengerName', () {
    test('adds the honorific from passenger gender', () {
      expect(
        formatPassengerName({
          'passengerName': '陳大文',
          'passengerGender': '先生',
        }),
        '陳大文 先生',
      );
      expect(
        formatPassengerName({
          'passengerName': '陳小文',
          'passengerGender': '女',
        }),
        '陳小文 女士',
      );
    });

    test('falls back to user gender and leaves unknown gender unchanged', () {
      expect(
        formatPassengerName({
          'user': {'name': 'Alex', 'gender': 'female'},
        }),
        'Alex 女士',
      );
      expect(
        formatPassengerName({
          'passengerName': 'Taylor',
          'passengerGender': 'unknown',
        }),
        'Taylor',
      );
    });

    test('bolds the passenger gender honorific', () {
      const style = TextStyle(fontSize: 16, fontWeight: FontWeight.w500);
      final span = passengerNameSpan('陳大文 先生', style: style);

      expect((span.children?.last as TextSpan).text, '先生');
      expect(
        (span.children?.last as TextSpan).style?.fontWeight,
        FontWeight.w700,
      );
    });

    test('does not duplicate an existing honorific', () {
      expect(
        formatPassengerName({
          'passengerName': '王先生',
          'passengerGender': '男',
        }),
        '王先生',
      );
    });
  });
}
