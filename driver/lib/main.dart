import 'package:flutter/material.dart';

import 'app/router.dart';
import 'app/route_names.dart';
import 'core/api/driver_api_client.dart';
import 'core/state/driver_alert_audio_controller.dart';
import 'core/state/driver_language_preference.dart';
import 'core/state/driver_order_alert_coordinator.dart';
import 'order_invite/order_invite_page.dart';

import 'package:driver_web/core/tokens/driver_tokens.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final api = DriverApiClient.instance;
  await api.restoreSession();
  final fragmentUri = Uri.tryParse(Uri.base.fragment);
  final directToken = Uri.base.queryParameters['token'];
  final fragmentToken = fragmentUri?.queryParameters['token'];
  final isOrderInvite = Uri.base.path.endsWith('/order-invite') ||
      fragmentUri?.path == DriverRouteNames.orderInvite;
  runApp(DriverApp(
    initialRoute: isOrderInvite
        ? DriverRouteNames.orderInvite
        : api.token == null
            ? DriverRouteNames.login
            : api.isApproved
                ? DriverRouteNames.home
                : DriverRouteNames.reviewStatus,
    orderInviteToken: isOrderInvite ? directToken ?? fragmentToken : null,
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
  const DriverApp({
    super.key,
    required this.initialRoute,
    this.orderInviteToken,
  });

  final String initialRoute;
  final String? orderInviteToken;
  static final scaffoldMessengerKey = GlobalKey<ScaffoldMessengerState>();
  static final navigatorKey = GlobalKey<NavigatorState>();

  @override
  Widget build(BuildContext context) {
    return DriverOrderAlertCoordinator(
      navigatorKey: navigatorKey,
      child: ValueListenableBuilder<String>(
        valueListenable: DriverLanguagePreference.instance,
        builder: (context, language, _) => MaterialApp(
          builder: (context, child) => ListenableBuilder(
            listenable: DriverAlertAudioController.instance,
            builder: (context, _) => Column(
              children: [
                if (DriverAlertAudioController.instance.requiresActivation)
                  _DriverAlertAudioBanner(),
                Expanded(child: child ?? const SizedBox.shrink()),
              ],
            ),
          ),
          navigatorKey: navigatorKey,
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
          onGenerateInitialRoutes: (_) => [
            MaterialPageRoute<void>(
              settings: RouteSettings(name: initialRoute),
              builder: initialRoute == DriverRouteNames.orderInvite
                  ? (_) => OrderInvitePage(token: orderInviteToken)
                  : DriverRouter.builders[initialRoute]!,
            ),
          ],
        ),
      ),
    );
  }
}

class _DriverAlertAudioBanner extends StatefulWidget {
  const _DriverAlertAudioBanner();

  @override
  State<_DriverAlertAudioBanner> createState() =>
      _DriverAlertAudioBannerState();
}

class _DriverAlertAudioBannerState extends State<_DriverAlertAudioBanner> {
  bool _activating = false;

  Future<void> _activate() async {
    if (_activating) return;
    setState(() => _activating = true);
    await DriverAlertAudioController.instance.activate();
    if (mounted) setState(() => _activating = false);
  }

  @override
  Widget build(BuildContext context) {
    final failed = DriverAlertAudioController.instance.state ==
        DriverAlertAudioState.failed;
    return Material(
      color: DriverColors.warningBackground,
      child: SafeArea(
        bottom: false,
        child: Padding(
          padding: const EdgeInsets.symmetric(
            horizontal: DriverSpacing.lg,
            vertical: DriverSpacing.sm,
          ),
          child: Row(
            children: [
              Expanded(
                child: Text(
                  failed
                      ? driverText('提示聲啟用失敗，請重試', '提示音启用失败，请重试',
                          'Alert sound activation failed. Try again.')
                      : driverText('點擊啟用新訂單提示聲', '点击启用新订单提示音',
                          'Tap to enable new order alerts'),
                  style: const TextStyle(color: DriverColors.warningText),
                ),
              ),
              const SizedBox(width: DriverSpacing.sm),
              TextButton(
                onPressed: _activating ? null : _activate,
                child: Text(_activating
                    ? driverText('啟用中…', '启用中…', 'Enabling…')
                    : driverText('啟用', '启用', 'Enable')),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
