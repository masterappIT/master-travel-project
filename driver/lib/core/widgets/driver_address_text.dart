import 'package:flutter/material.dart';
import 'package:pinyin/pinyin.dart';

import '../state/driver_language_preference.dart';

String formatDriverAddress(String address, String language) =>
    switch (language) {
      DriverLanguagePreference.traditionalChinese =>
        ChineseHelper.convertToTraditionalChinese(address),
      DriverLanguagePreference.simplifiedChinese =>
        ChineseHelper.convertToSimplifiedChinese(address),
      _ => address,
    };

class DriverAddressText extends StatelessWidget {
  const DriverAddressText(this.address,
      {super.key, this.style, this.maxLines, this.overflow, this.textAlign});

  final String address;
  final TextStyle? style;
  final int? maxLines;
  final TextOverflow? overflow;
  final TextAlign? textAlign;

  @override
  Widget build(BuildContext context) => ValueListenableBuilder<String>(
        valueListenable: DriverLanguagePreference.instance,
        builder: (context, language, _) => Text(
          formatDriverAddress(address, language),
          style: style,
          maxLines: maxLines,
          overflow: overflow,
          textAlign: textAlign,
        ),
      );
}
