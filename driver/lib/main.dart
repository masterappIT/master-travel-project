import 'package:flutter/material.dart';

import 'app/router.dart';

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
        scaffoldBackgroundColor: const Color(0xfff0f2f5),
      ),
      routes: DriverRoutes.builders,
      home: null,
      initialRoute: DriverRoutes.login,
    );
  }
}
