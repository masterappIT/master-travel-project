import 'package:flutter/material.dart';

import 'app/router.dart';
import 'app/route_names.dart';
import 'core/api/driver_api_client.dart';

import 'package:driver_web/core/tokens/driver_tokens.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await DriverApiClient.instance.restoreSession();
  runApp(DriverApp(
    initialRoute: DriverApiClient.instance.token == null
        ? DriverRouteNames.login
        : DriverRouteNames.home,
  ));
}

class DriverApp extends StatelessWidget {
  const DriverApp({super.key, required this.initialRoute});

  final String initialRoute;

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        fontFamily: 'Noto Sans TC',
        useMaterial3: true,
        scaffoldBackgroundColor: DriverColors.background,
        colorScheme: ColorScheme.fromSeed(
          seedColor: DriverColors.primary,
          surface: DriverColors.surface,
          brightness: Brightness.light,
        ),
        cardTheme: CardThemeData(
          color: DriverColors.surface,
          elevation: 0,
          margin: EdgeInsets.zero,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(DriverRadii.card),
            side: const BorderSide(color: DriverColors.divider),
          ),
        ),
      ),
      routes: DriverRouter.builders,
      home: null,
      initialRoute: initialRoute,
    );
  }
}
