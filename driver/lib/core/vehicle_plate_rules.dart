import 'package:flutter/services.dart';

String normalizeHongKongPlate(String value) => value.trim().toUpperCase();
String normalizeMacauPlate(String value) => value.trim().toUpperCase();
String normalizeMainlandPlate(String value) =>
    value.trim().replaceAll(RegExp(r'[•・]'), '·').toUpperCase();

String formatMacauPlateInput(String value) {
  final raw = value.toUpperCase().replaceAll(RegExp(r'[^A-Z0-9]'), '');
  final buffer = StringBuffer();
  for (final character in raw.split('')) {
    final expectsLetter = buffer.length < 2;
    if ((expectsLetter && RegExp(r'[A-Z]').hasMatch(character)) ||
        (!expectsLetter && RegExp(r'[0-9]').hasMatch(character))) {
      buffer.write(character);
    }
    if (buffer.length == 6) break;
  }
  final limited = buffer.toString();
  final firstEnd = limited.length < 2 ? limited.length : 2;
  final secondEnd = limited.length < 4 ? limited.length : 4;
  return [
    limited.substring(0, firstEnd),
    if (limited.length > 2) limited.substring(2, secondEnd),
    if (limited.length > 4) limited.substring(4),
  ].where((part) => part.isNotEmpty).join('-');
}

String mainlandPlateInput(String value, String vehicleOwnership) {
  final plate = normalizeMainlandPlate(value);
  if (vehicleOwnership == '香港' &&
      plate.startsWith('粵Z·') &&
      plate.endsWith('港')) {
    return plate.substring(3, plate.length - 1);
  }
  if (vehicleOwnership == '澳門' &&
      plate.startsWith('粵Z·') &&
      plate.endsWith('澳')) {
    return plate.substring(3, plate.length - 1);
  }
  if (vehicleOwnership == '中國內地' && plate.startsWith('粵')) {
    return plate.substring(1);
  }
  return plate;
}

String composeMainlandPlate(String value, String vehicleOwnership) {
  final input =
      mainlandPlateInput(value, vehicleOwnership).replaceAll(RegExp(r'\s'), '');
  if (input.isEmpty) return '';
  if (vehicleOwnership == '香港') return '粵Z·$input港';
  if (vehicleOwnership == '澳門') return '粵Z·$input澳';
  return '粵$input';
}

String? vehiclePlateError({
  required String vehicleOwnership,
  required String hongKongPlate,
  required String macauPlate,
  required String mainlandPlate,
}) {
  final hk = normalizeHongKongPlate(hongKongPlate);
  final macau = normalizeMacauPlate(macauPlate);
  final mainland = normalizeMainlandPlate(mainlandPlate);
  if (hk.isNotEmpty &&
      (!RegExp(r'^[A-Z0-9 ]+$').hasMatch(hk) ||
          hk.replaceAll(' ', '').length > 8)) {
    return '香港車牌只可包含大寫英文字母、數字及空格，不含空格最多 8 個字元';
  }
  if (macau.isNotEmpty &&
      !RegExp(r'^[A-Z]{2}-[0-9]{2}-[0-9]{2}$').hasMatch(macau)) {
    return '澳門車牌格式必須為 AA-00-00，不可包含空格';
  }
  final mainlandPattern = vehicleOwnership == '香港'
      ? RegExp(r'^粵Z·\S+港$')
      : vehicleOwnership == '澳門'
          ? RegExp(r'^粵Z·\S+澳$')
          : RegExp(r'^粵[A-Z]·\S+$');
  if (mainland.isNotEmpty &&
      (!mainlandPattern.hasMatch(mainland) ||
          RegExp(r'\s').hasMatch(mainland))) {
    if (vehicleOwnership == '香港') {
      return '香港跨境車牌格式必須為粵Z·內容港，不可包含空格';
    }
    if (vehicleOwnership == '澳門') {
      return '澳門跨境車牌格式必須為粵Z·內容澳，不可包含空格';
    }
    return '內地車牌格式必須為粵A·內容，不可包含空格';
  }
  return null;
}

TextInputFormatter vehiclePlateFormatter(String region) {
  if (region == '香港') {
    return TextInputFormatter.withFunction((oldValue, newValue) {
      final normalized = newValue.text.toUpperCase();
      if (!RegExp(r'^[A-Z0-9 ]*$').hasMatch(normalized) ||
          normalized.replaceAll(' ', '').length > 8) {
        return oldValue;
      }
      return newValue.copyWith(
          text: normalized,
          selection: TextSelection.collapsed(offset: normalized.length));
    });
  }
  if (region == '澳門') {
    return TextInputFormatter.withFunction((oldValue, newValue) {
      final normalized = formatMacauPlateInput(newValue.text);
      return newValue.copyWith(
          text: normalized,
          selection: TextSelection.collapsed(offset: normalized.length));
    });
  }
  return TextInputFormatter.withFunction((oldValue, newValue) {
    final normalized =
        newValue.text.replaceAll(RegExp(r'[•・]'), '·').toUpperCase();
    if (RegExp(r'\s').hasMatch(normalized)) return oldValue;
    return newValue.copyWith(
        text: normalized,
        selection: TextSelection.collapsed(offset: normalized.length));
  });
}
