import 'package:flutter/services.dart';

String normalizeHongKongPlate(String value) => value.trim().toUpperCase();
String normalizeMacauPlate(String value) => value.trim().toUpperCase();
String normalizeMainlandPlate(String value) =>
    value.trim().replaceAll(RegExp(r'[•・]'), '·').toUpperCase();

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
      final normalized = newValue.text.toUpperCase();
      if (!RegExp(r'^[A-Z0-9-]{0,8}$').hasMatch(normalized)) {
        return oldValue;
      }
      return newValue.copyWith(
          text: normalized,
          selection: TextSelection.collapsed(offset: normalized.length));
    });
  }
  return TextInputFormatter.withFunction((oldValue, newValue) {
    final normalized =
        newValue.text.replaceAll(RegExp(r'[•・]'), '·').toUpperCase();
    if (RegExp(r'\s').hasMatch(normalized)) {
      return oldValue;
    }
    return newValue.copyWith(
        text: normalized,
        selection: TextSelection.collapsed(offset: normalized.length));
  });
}
