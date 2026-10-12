import 'package:flutter/material.dart';

import '../auth/login_page.dart';
import '../home_page.dart';
import '../order_invite/order_invite_page.dart';
import '../review_status_page.dart';
import '../core/api/driver_api_client.dart';
import '../core/fonts/driver_font_layers.dart';
import '../core/state/driver_currency_initialization.dart';
import '../core/tokens/driver_tokens.dart';
import 'deferred_routes.dart' deferred as deferred_routes;
import 'route_names.dart';

abstract final class DriverRouter {
  static Map<String, WidgetBuilder> get builders => {
        DriverRouteNames.login: (_) => const LoginPage(),
        DriverRouteNames.orderInvite: (_) => const OrderInvitePage(),
        DriverRouteNames.reviewStatus: (_) => const ReviewStatusPage(),
        DriverRouteNames.home: (_) =>
            _approved(const HomePage(), currencyGate: false),
        for (final route in _currencyRoutes)
          route: (context) => _approved(_DeferredRoute(
                route: route,
                arguments: ModalRoute.of(context)?.settings.arguments,
              )),
        for (final route in _otherRoutes)
          route: (context) => _DeferredRoute(
                route: route,
                arguments: ModalRoute.of(context)?.settings.arguments,
              ),
      };

  static const _currencyRoutes = [
    DriverRouteNames.orders,
    DriverRouteNames.orderHistory,
    DriverRouteNames.orderDetail,
    DriverRouteNames.completedOrderDetail,
    DriverRouteNames.orderAccepted,
    DriverRouteNames.orderInProgress,
    DriverRouteNames.orderCompleted,
  ];

  // Pages with free-text inputs wait for every font layer so typed or pasted
  // characters never render as missing-glyph boxes.
  static const textInputRoutes = {
    DriverRouteNames.registration,
    DriverRouteNames.profileEdit,
    DriverRouteNames.flightQuery,
    DriverRouteNames.wechatPayment,
    DriverRouteNames.contactSupport,
    DriverRouteNames.addVehicle,
  };

  static const _otherRoutes = [
    DriverRouteNames.registration,
    DriverRouteNames.profile,
    DriverRouteNames.flightQuery,
    DriverRouteNames.currency,
    DriverRouteNames.wechatPayment,
    DriverRouteNames.settlementOverview,
    DriverRouteNames.about,
    DriverRouteNames.contactSupport,
    DriverRouteNames.vehicle,
    DriverRouteNames.notificationSettings,
    DriverRouteNames.languageSettings,
    DriverRouteNames.addVehicle,
    DriverRouteNames.profileEdit,
  ];

  static Widget _approved(Widget page, {bool currencyGate = true}) =>
      DriverApiClient.instance.isApproved
          ? currencyGate
              ? _DriverCurrencyGate(child: page)
              : page
          : const ReviewStatusPage();
}

class _DeferredRoute extends StatefulWidget {
  const _DeferredRoute({required this.route, this.arguments});

  final String route;
  final Object? arguments;

  @override
  State<_DeferredRoute> createState() => _DeferredRouteState();
}

class _DeferredRouteState extends State<_DeferredRoute> {
  late Future<void> _load = _loadRoute();

  Future<void> _loadRoute() => Future.wait([
        deferred_routes.loadLibrary(),
        if (DriverRouter.textInputRoutes.contains(widget.route))
          DriverFontLayers.loadAll(),
      ]);

  @override
  Widget build(BuildContext context) => FutureBuilder<void>(
        future: _load,
        builder: (context, snapshot) {
          if (snapshot.hasError) {
            return Scaffold(
              backgroundColor: DriverColors.background,
              body: Center(
                child: TextButton(
                  onPressed: () => setState(() {
                    _load = _loadRoute();
                  }),
                  child: const Text('頁面載入失敗，請重試'),
                ),
              ),
            );
          }
          if (snapshot.connectionState != ConnectionState.done) {
            return const Scaffold(
              backgroundColor: DriverColors.background,
              body: Center(child: CircularProgressIndicator()),
            );
          }
          return deferred_routes.buildDriverRoute(
              widget.route, widget.arguments);
        },
      );
}

class _DriverCurrencyGate extends StatefulWidget {
  const _DriverCurrencyGate({required this.child});

  final Widget child;

  @override
  State<_DriverCurrencyGate> createState() => _DriverCurrencyGateState();
}

class _DriverCurrencyGateState extends State<_DriverCurrencyGate> {
  late final Future<void> _ready = DriverCurrencyInitialization.ensureReady();

  @override
  Widget build(BuildContext context) {
    if (DriverCurrencyInitialization.isReady) return widget.child;
    return FutureBuilder<void>(
      future: _ready,
      builder: (context, snapshot) =>
          snapshot.connectionState == ConnectionState.done
              ? widget.child
              : const Scaffold(
                  backgroundColor: DriverColors.background,
                  body: SizedBox.shrink(),
                ),
    );
  }
}
