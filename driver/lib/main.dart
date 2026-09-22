import 'package:flutter/material.dart';

import 'app/router.dart';
import 'app/route_names.dart';
import 'core/api/driver_api_client.dart';
import 'core/state/driver_language_preference.dart';
import 'core/state/driver_order_alert_coordinator.dart';

import 'package:driver_web/core/tokens/driver_tokens.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final api = DriverApiClient.instance;
  await api.restoreSession();
  runApp(DriverApp(
    initialRoute: api.token == null
        ? DriverRouteNames.login
        : api.isApproved
            ? DriverRouteNames.home
            : DriverRouteNames.reviewStatus,
  ));
}

class _NoPageTransitionBuilder extends PageTransitionsBuilder {
  const _NoPageTransitionBuilder();

  @override
  Widget buildTransitions<T>(
    PageRoute<T> route,
    BuildContext context,
    Animation<double> animation,
    Animation<double> secondaryAnimation,
    Widget child,
  ) {
    return child;
  }
}

class DriverApp extends StatelessWidget {
  const DriverApp({super.key, required this.initialRoute});

  final String initialRoute;
  static final scaffoldMessengerKey = GlobalKey<ScaffoldMessengerState>();

  @override
  Widget build(BuildContext context) {
    return DriverOrderAlertCoordinator(
      scaffoldMessengerKey: scaffoldMessengerKey,
      child: ValueListenableBuilder<String>(
        valueListenable: DriverLanguagePreference.instance,
        builder: (context, language, _) => MaterialApp(
          scaffoldMessengerKey: scaffoldMessengerKey,
          debugShowCheckedModeBanner: false,
          locale: language == DriverLanguagePreference.english
              ? const Locale('en')
              : language == DriverLanguagePreference.simplifiedChinese
                  ? const Locale('zh', 'CN')
                  : const Locale('zh', 'TW'),
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
            pageTransitionsTheme: const PageTransitionsTheme(
              builders: {
                TargetPlatform.android: _NoPageTransitionBuilder(),
                TargetPlatform.iOS: _NoPageTransitionBuilder(),
                TargetPlatform.macOS: _NoPageTransitionBuilder(),
                TargetPlatform.windows: _NoPageTransitionBuilder(),
                TargetPlatform.linux: _NoPageTransitionBuilder(),
                TargetPlatform.fuchsia: _NoPageTransitionBuilder(),
              },
            ),
          ),
          routes: DriverRouter.builders,
          home: null,
          initialRoute: initialRoute,
        ),
      ),
    );
  }
}
