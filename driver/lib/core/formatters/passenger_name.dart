import 'package:flutter/material.dart';

String formatPassengerName(
  Map<String, dynamic>? trip, {
  String fallback = '乘客',
}) {
  final user = trip?['user'];
  final userMap = user is Map ? user : null;
  final name = _text(trip?['passengerName']) ?? _text(userMap?['name']);
  if (name == null) return fallback;

  final gender = (_text(trip?['passengerGender']) ?? _text(userMap?['gender']))
      ?.toLowerCase();
  final honorific = switch (gender) {
    '先生' || '男' || 'm' || 'male' => '先生',
    '女士' || '女' || 'f' || 'female' => '女士',
    _ => null,
  };
  if (honorific == null || name.endsWith(honorific)) return name;
  return '$name $honorific';
}

class PassengerNameText extends StatelessWidget {
  const PassengerNameText(
    this.value, {
    required this.style,
    this.overflow,
    this.maxLines,
    super.key,
  });

  final String value;
  final TextStyle style;
  final TextOverflow? overflow;
  final int? maxLines;

  @override
  Widget build(BuildContext context) => Text.rich(
        passengerNameSpan(value, style: style),
        overflow: overflow,
        maxLines: maxLines,
      );
}

TextSpan passengerNameSpan(
  String value, {
  required TextStyle style,
}) {
  final match = RegExp(r'^(.*?)(\s*)(先生|女士)$').firstMatch(value);
  if (match == null) return TextSpan(text: value, style: style);
  return TextSpan(
    style: style,
    children: [
      TextSpan(text: '${match.group(1)}${match.group(2)}'),
      TextSpan(
        text: match.group(3),
        style: style.copyWith(fontWeight: FontWeight.w700),
      ),
    ],
  );
}

String? _text(dynamic value) {
  final text = value?.toString().trim();
  return text == null || text.isEmpty ? null : text;
}
