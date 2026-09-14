import 'package:flutter/material.dart';

import 'app/router.dart';
import 'app/route_names.dart';

import 'package:driver_web/core/tokens/driver_tokens.dart';

void main() => runApp(const DriverApp());

class DriverApp extends StatelessWidget {
  const DriverApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        fontFamily: 'Noto Sans TC',
        useMaterial3: true,
        scaffoldBackgroundColor: DriverColors.background,
      ),
      routes: DriverRouter.builders,
      home: null,
      initialRoute: DriverRouteNames.login,
    );
  }
}
