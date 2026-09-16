import 'package:flutter/material.dart';

abstract final class DriverColors {
  static const background = Color(0xfff4f7fb);
  static const surface = Color(0xffffffff);
  static const elevatedSurface = Color(0xffffffff);
  static const text = Color(0xff17233d);
  static const secondaryText = Color(0xff65738b);
  static const mutedText = Color(0xff98a3b5);
  static const labelText = Color(0xff41506a);
  static const border = Color(0xffdbe3ef);
  static const divider = Color(0xffe8edf4);
  static const primary = Color(0xff3568e8);
  static const primaryDark = Color(0xff1e4fc7);
  static const onPrimary = Color(0xffffffff);
  static const activeBlue = Color(0xff3568e8);
  static const accent = Color(0xff3568e8);
  static const success = Color(0xff3568e8);
  static const successBackground = Color(0xffe8f0ff);
  static const warningBackground = Color(0xffeef3fa);
  static const warningText = Color(0xff65738b);
  static const infoBackground = Color(0xffe8f0ff);
  static const darkGreen = Color(0xff245bd6);
  static const navInactive = Color(0xff8793a8);
  static const navActive = Color(0xff245bd6);
  static const panelTint = Color(0xffe8f0ff);
  static const shellAccent = Color(0xffe8f0ff);
}

abstract final class DriverShadows {
  static const floating = [
    BoxShadow(
      color: Color(0x1f000000),
      blurRadius: 24,
      offset: Offset(0, 10),
    ),
  ];

  static const card = [
    BoxShadow(
      color: Color(0x14000000),
      blurRadius: 18,
      offset: Offset(0, 8),
    ),
  ];
}

abstract final class DriverSpacing {
  static const xs = 4.0;
  static const sm = 8.0;
  static const md = 12.0;
  static const lg = 16.0;
  static const xl = 24.0;
}

abstract final class DriverRadii {
  static const card = 16.0;
  static const input = 12.0;
  static const pill = 100.0;
}

abstract final class DriverTypography {
  static const body = 14.0;
  static const bodyLarge = 16.0;
  static const label = 13.0;
  static const caption = 12.0;
}

abstract final class DriverDimensions {
  static const maxContentWidth = 430.0;
  static const pageTopPadding = 24.0;
  static const pageHorizontalPadding = 24.0;
  static const navHorizontalPadding = 30.0;
  static const bottomNavigationPadding = 140.0;
  static const navBottomInset = 16.0;
}
