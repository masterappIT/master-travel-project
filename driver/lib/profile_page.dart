import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

import 'app/route_names.dart';
import 'core/api/driver_api_client.dart';
import 'core/layout/driver_page_shell.dart';
import 'core/state/driver_currency_preference.dart';
import 'core/state/driver_language_preference.dart';
import 'core/navigation/driver_navigation.dart';

import 'package:driver_web/core/tokens/driver_tokens.dart';

class ProfilePage extends StatefulWidget {
  const ProfilePage({super.key});

  @override
  State<ProfilePage> createState() => _ProfilePageState();
}

class _ProfilePageState extends State<ProfilePage> {
  final _api = DriverApiClient.instance;
  bool _loading = true;
  String? _error;
  String _name = '陳大文';
  String _vehicleSummary = '香港 · 兩地牌 · 車輛';
  String _hongKongMacauPhone = '+852 9123 4567';
  String _mainlandPhone = '+86 未填寫';
  String? _wechatId;
  bool _hasWechatQrCode = false;
  String _settledAmount = '0';
  String _unsettledAmount = '0';

  @override
  void initState() {
    super.initState();
    _loadProfile();
  }

  Future<void> _loadProfile() async {
    try {
      final results = await Future.wait<dynamic>([
        _api.me(),
        _api.statistics(),
        _api.listDriverVehicles(),
      ]);
      final driver = Map<String, dynamic>.from(results[0] as Map);
      final statistics = Map<String, dynamic>.from(results[1] as Map);
      final vehicles = Map<String, dynamic>.from(results[2] as Map);
      final vehicleItems = vehicles['data'] is List
          ? List<dynamic>.from(vehicles['data'] as List)
          : const <dynamic>[];
      if (!mounted) return;
      setState(() {
        _name = driver['name']?.toString() ?? _name;
        _vehicleSummary = vehicleItems.isEmpty
            ? '尚未登記車輛'
            : _vehicleSummaryFrom(
                Map<String, dynamic>.from(vehicleItems.first as Map));
        final hongKongMacauCode =
            driver['hongKongMacauCountryCode']?.toString() ??
                (driver['phoneCountryCode'] == '+853' ? '+853' : '+852');
        final hongKongMacauNumber = driver['hongKongMacauPhone']?.toString() ??
            (driver['phoneCountryCode'] == '+86'
                ? ''
                : driver['phone']?.toString() ?? '');
        _hongKongMacauPhone = '$hongKongMacauCode $hongKongMacauNumber'.trim();
        final mainlandNumber = driver['mainlandPhone']?.toString() ??
            (driver['phoneCountryCode'] == '+86'
                ? driver['phone']?.toString()
                : null);
        _mainlandPhone = mainlandNumber == null || mainlandNumber.isEmpty
            ? '+86 未填寫'
            : '+86 $mainlandNumber';
        _wechatId = driver['wechatId']?.toString();
        _hasWechatQrCode =
            driver['wechatQrCodeUrl']?.toString().isNotEmpty ?? false;
        final settlement = statistics['settlement'] is Map
            ? Map<String, dynamic>.from(statistics['settlement'] as Map)
            : <String, dynamic>{};
        _settledAmount = _formatAmount(settlement['settledEarnings']);
        _unsettledAmount = _formatAmount(settlement['unsettledEarnings']);
        _loading = false;
      });
    } on DriverApiException catch (error) {
      if (mounted) {
        setState(() {
          _error = error.message;
          _loading = false;
        });
      }
    }
  }

  String _vehicleSummaryFrom(Map<String, dynamic> vehicle) {
    final plateType = vehicle['plateType']?.toString().trim();
    final category = vehicle['vehicleCategory']?.toString().trim();
    final region = (vehicle['hkPlate']?.toString().trim().isNotEmpty ?? false)
        ? '香港'
        : '香港';
    return [
      region,
      if (plateType != null && plateType.isNotEmpty) plateType,
      if (category != null && category.isNotEmpty) category,
    ].join(' · ');
  }

  String _formatAmount(dynamic value) {
    final amount = value is num ? value : num.tryParse(value?.toString() ?? '');
    if (amount == null) return '0';
    final digits = amount == amount.roundToDouble() ? 0 : 2;
    return amount.toStringAsFixed(digits);
  }

  Future<void> _showNotifications() async {
    try {
      final items = await _api.notifications();
      if (!mounted) return;
      await showModalBottomSheet<void>(
        context: context,
        builder: (context) => SafeArea(
          child: ListView(
            shrinkWrap: true,
            padding: const EdgeInsets.all(24),
            children: [
              const Text('通知',
                  style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700)),
              const SizedBox(height: 12),
              if (items.isEmpty) const Text('目前沒有通知'),
              ...items.map((item) {
                final notification = Map<String, dynamic>.from(item as Map);
                final id = notification['id']?.toString();
                return ListTile(
                  title: Text(notification['title']?.toString() ?? '通知'),
                  subtitle: Text(notification['message']?.toString() ?? ''),
                  onTap: id == null
                      ? null
                      : () async {
                          await _api.readNotification(id);
                          if (context.mounted) Navigator.of(context).pop();
                        },
                );
              }),
            ],
          ),
        ),
      );
    } on DriverApiException catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(error.message)));
      }
    }
  }

  Future<void> _openProfileEditor() async {
    final result = await DriverNavigation.push(
      context,
      DriverRouteNames.profileEdit,
      arguments: <String, String>{
        'name': _name,
        'hongKongMacauPhone': _hongKongMacauPhone,
        'mainlandPhone': _mainlandPhone,
      },
    );
    if (!mounted || result is! Map<String, String>) return;
    setState(() {
      _name = result['name'] ?? _name;
      _hongKongMacauPhone = result['hongKongMacauPhone'] ?? _hongKongMacauPhone;
      _mainlandPhone = result['mainlandPhone'] ?? _mainlandPhone;
    });
  }

  @override
  Widget build(BuildContext context) {
    return DriverPageShell(
      selectedIndex: 2,
      bottomPadding: 140,
      navHorizontalPadding: 30,
      onHomeTap: () => DriverNavigation.replace(context, DriverRouteNames.home),
      onOrderTap: () =>
          DriverNavigation.replace(context, DriverRouteNames.orders),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _ProfileHeader(
              name: _name,
              vehicleSummary: _vehicleSummary,
              onNotification: _showNotifications),
          if (_loading)
            const Center(
              child: Padding(
                padding: EdgeInsets.symmetric(vertical: DriverSpacing.xl),
                child: CircularProgressIndicator(),
              ),
            )
          else if (_error != null)
            Center(
                child: Padding(
              padding: EdgeInsets.symmetric(vertical: DriverSpacing.xl),
              child: Text(_error!),
            ))
          else ...[
            const SizedBox(height: DriverSpacing.xl),
            ValueListenableBuilder<String>(
              valueListenable: DriverCurrencyPreference.instance,
              builder: (context, currency, _) => _BalanceCard(
                settledAmount: _settledAmount,
                unsettledAmount: _unsettledAmount,
                currency: currency,
                onTap: () => DriverNavigation.push(
                    context, DriverRouteNames.settlementOverview),
              ),
            ),
            const SizedBox(height: DriverSpacing.xl),
            _MenuCard(
              title: driverText('主要功能', '主要功能', 'Main features'),
              items: [
                _MenuItem(
                  driverText('個人資料', '个人资料', 'Personal details'),
                  'assets/profile-user.svg',
                  _IconTone.neutral,
                  onTap: _openProfileEditor,
                ),
                _MenuItem(
                  driverText('車輛資料', '车辆资料', 'Vehicle details'),
                  'assets/profile-vehicle.svg',
                  _IconTone.neutral,
                  onTap: () =>
                      DriverNavigation.push(context, DriverRouteNames.vehicle),
                ),
                _MenuItem(
                  driverText('接單紀錄', '接单记录', 'Trip history'),
                  'assets/profile-clipboard.svg',
                  _IconTone.neutral,
                  onTap: () => DriverNavigation.push(
                      context, DriverRouteNames.orderHistory),
                ),
                _MenuItem(
                  driverText('航班查詢', '航班查询', 'Flight search'),
                  'assets/profile-fps.svg',
                  _IconTone.neutral,
                  detail: '查詢香港國際機場離港航班',
                  onTap: () => DriverNavigation.push(
                      context, DriverRouteNames.flightQuery),
                ),
              ],
            ),
            const SizedBox(height: DriverSpacing.xl),
            _MenuCard(
              title: driverText('收款設定', '收款设置', 'Payment settings'),
              items: [
                _MenuItem('收款幣種', 'assets/profile-fps.svg', _IconTone.warning,
                    detail: '港幣 HKD、人民幣 CNY',
                    onTap: () => DriverNavigation.push(
                        context, DriverRouteNames.currency)),
                _MenuItem(
                    '微信支付',
                    'assets/profile-wechat.svg',
                    _wechatId != null &&
                            _wechatId!.isNotEmpty &&
                            _hasWechatQrCode
                        ? _IconTone.success
                        : _IconTone.neutral,
                    detail: _wechatId != null &&
                            _wechatId!.isNotEmpty &&
                            _hasWechatQrCode
                        ? '已綁定：$_wechatId'
                        : '未綁定', onTap: () async {
                  final result = await DriverNavigation.push(
                      context, DriverRouteNames.wechatPayment);
                  if (result is Map<String, dynamic> && mounted) {
                    setState(() {
                      _wechatId = result['wechatId']?.toString();
                      _hasWechatQrCode =
                          result['wechatQrCodeUrl']?.toString().isNotEmpty ??
                              false;
                    });
                  }
                }),
                _MenuItem('支付寶', 'assets/profile-fps.svg', _IconTone.neutral,
                    detail: '未綁定'),
                _MenuItem(
                    'FPS 轉數快', 'assets/profile-fps.svg', _IconTone.success,
                    detail: '已綁定：$_name'),
              ],
            ),
            const SizedBox(height: DriverSpacing.xl),
            _MenuCard(
              title: driverText('設定', '设置', 'Settings'),
              items: [
                _MenuItem(driverText('通知設定', '通知设置', 'Notifications'),
                    'assets/profile-bell.svg', _IconTone.neutral,
                    onTap: () => DriverNavigation.push(
                        context, DriverRouteNames.notificationSettings)),
                _MenuItem(
                    driverText('語言設定', '语言设置', 'Language'),
                    'assets/profile-fps.svg',
                    _IconTone.neutral, onTap: () async {
                  await DriverNavigation.push(
                      context, DriverRouteNames.languageSettings);
                  if (mounted) setState(() {});
                }),
                _MenuItem('自動結算', 'assets/profile-fps.svg', _IconTone.neutral,
                    toggle: true),
                _MenuItem('結算方式', 'assets/profile-fps.svg', _IconTone.neutral),
              ],
            ),
            const SizedBox(height: DriverSpacing.xl),
            _MenuCard(
              title: driverText('其他', '其他', 'Other'),
              items: [
                _MenuItem('關於我們', 'assets/profile-fps.svg', _IconTone.neutral,
                    onTap: () =>
                        DriverNavigation.push(context, DriverRouteNames.about)),
                _MenuItem(
                    '聯繫客服', 'assets/profile-headphones.svg', _IconTone.neutral,
                    onTap: () => DriverNavigation.push(
                        context, DriverRouteNames.contactSupport)),
              ],
            ),
            const SizedBox(height: DriverSpacing.lg),
            _LogoutButton(onTap: () async {
              await _api.logout();
              if (!context.mounted) {
                return;
              }
              DriverNavigation.replaceAll(context, DriverRouteNames.login);
            }),
          ],
        ],
      ),
    );
  }
}

class _ProfileHeader extends StatelessWidget {
  const _ProfileHeader(
      {required this.name,
      required this.vehicleSummary,
      required this.onNotification});

  final String name;
  final String vehicleSummary;
  final VoidCallback onNotification;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(name,
                style: TextStyle(
                    fontSize: 28,
                    fontWeight: FontWeight.w700,
                    color: DriverColors.text)),
            Semantics(
              button: true,
              label: '通知',
              child: InkWell(
                onTap: onNotification,
                borderRadius: BorderRadius.circular(20),
                child: Container(
                  width: 40,
                  height: 40,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    color: DriverColors.surface,
                    border: Border.all(color: DriverColors.divider),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: SvgPicture.asset('assets/home-bell.svg',
                      width: 24, height: 24),
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 10),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
          decoration: BoxDecoration(
              color: DriverColors.successBackground,
              borderRadius: BorderRadius.circular(DriverRadii.pill)),
          child: const Text('已認證司機',
              style: TextStyle(
                  fontSize: DriverTypography.label,
                  fontWeight: FontWeight.w700,
                  color: DriverColors.darkGreen)),
        ),
        const SizedBox(height: DriverSpacing.sm),
        Text(vehicleSummary,
            style: TextStyle(
                fontSize: DriverTypography.body,
                color: DriverColors.secondaryText)),
      ],
    );
  }
}

class _BalanceCard extends StatelessWidget {
  const _BalanceCard(
      {required this.settledAmount,
      required this.unsettledAmount,
      required this.currency,
      required this.onTap});

  final String settledAmount;
  final String unsettledAmount;
  final String currency;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Semantics(
        button: true,
        label: '結算概覽',
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(DriverRadii.card),
          child: _CardShell(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Text('結算概覽',
                    style: TextStyle(
                        fontSize: DriverTypography.bodyLarge,
                        fontWeight: FontWeight.w700,
                        color: DriverColors.text)),
                const SizedBox(height: DriverSpacing.md),
                Row(children: [
                  Expanded(
                      child: _BalanceTile(
                          label: '已結算',
                          value: settledAmount,
                          background: DriverColors.infoBackground,
                          labelColor: DriverColors.primary,
                          valueColor: DriverColors.primary,
                          currency: currency)),
                  const SizedBox(width: DriverSpacing.md),
                  Expanded(
                      child: _BalanceTile(
                          label: '未結算',
                          value: unsettledAmount,
                          background: DriverColors.warningBackground,
                          labelColor: DriverColors.secondaryText,
                          valueColor: DriverColors.primary,
                          currency: currency)),
                ]),
              ],
            ),
          ),
        ),
      );
}

class _BalanceTile extends StatelessWidget {
  const _BalanceTile(
      {required this.label,
      required this.value,
      required this.background,
      required this.labelColor,
      required this.valueColor,
      required this.currency});
  final String label;
  final String value;
  final Color background;
  final Color labelColor;
  final Color valueColor;
  final String currency;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
            color: background,
            borderRadius: BorderRadius.circular(DriverRadii.input)),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(label,
              style: TextStyle(
                  fontSize: DriverTypography.label, color: labelColor)),
          const SizedBox(height: 6),
          FittedBox(
              alignment: Alignment.centerLeft,
              fit: BoxFit.scaleDown,
              child: Text(value,
                  style: TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.w700,
                      color: valueColor))),
          const SizedBox(height: 2),
          Text(currency,
              style: TextStyle(
                  fontSize: 11, color: labelColor.withValues(alpha: .6))),
        ]),
      );
}

enum _IconTone { neutral, success, warning }

class _MenuItem {
  const _MenuItem(this.label, this.asset, this.tone,
      {this.detail, this.toggle = false, this.onTap});
  final String label;
  final String asset;
  final _IconTone tone;
  final String? detail;
  final bool toggle;
  final VoidCallback? onTap;
}

class _MenuCard extends StatelessWidget {
  const _MenuCard({required this.title, required this.items});
  final String title;
  final List<_MenuItem> items;

  @override
  Widget build(BuildContext context) => _CardShell(
        child:
            Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          Text(title,
              style: const TextStyle(
                  fontSize: DriverTypography.bodyLarge,
                  fontWeight: FontWeight.w700,
                  color: DriverColors.text)),
          const SizedBox(height: DriverSpacing.md),
          for (var i = 0; i < items.length; i++) ...[
            _MenuRow(item: items[i]),
            if (i < items.length - 1)
              const Divider(
                  height: 1,
                  indent: 48,
                  endIndent: 0,
                  color: DriverColors.divider),
          ],
        ]),
      );
}

class _MenuRow extends StatelessWidget {
  const _MenuRow({required this.item});
  final _MenuItem item;

  Color get _background => switch (item.tone) {
        _IconTone.neutral => DriverColors.infoBackground,
        _IconTone.success => DriverColors.successBackground,
        _IconTone.warning => DriverColors.warningBackground,
      };

  Color get _iconColor => switch (item.tone) {
        _IconTone.neutral => DriverColors.primary,
        _IconTone.success => DriverColors.darkGreen,
        _IconTone.warning => DriverColors.warningText,
      };

  IconData get _icon => switch (item.label) {
        '個人資料' || '个人资料' || 'Personal details' => Icons.person_outline_rounded,
        '車輛資料' || '车辆资料' || 'Vehicle details' => Icons.directions_car_outlined,
        '接單紀錄' || '接单记录' || 'Trip history' => Icons.receipt_long_outlined,
        '收款幣種' => Icons.payments_outlined,
        '微信支付' => Icons.qr_code_2_rounded,
        '支付寶' => Icons.account_balance_wallet_rounded,
        'FPS 轉數快' => Icons.swap_horizontal_circle_outlined,
        '通知設定' || '通知设置' || 'Notifications' => Icons.notifications_none_rounded,
        '語言設定' || '语言设置' || 'Language' => Icons.language_rounded,
        '自動結算' => Icons.autorenew_rounded,
        '結算方式' => Icons.account_balance_rounded,
        '關於我們' => Icons.info_outline_rounded,
        '聯繫客服' => Icons.headset_mic_outlined,
        _ => Icons.tune_rounded,
      };

  @override
  Widget build(BuildContext context) => Semantics(
        button: true,
        label: item.label,
        child: InkWell(
          onTap: item.onTap ?? () {},
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 14),
            child: Row(children: [
              Container(
                  width: 36,
                  height: 36,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                      color: _background,
                      borderRadius: BorderRadius.circular(18)),
                  child: Icon(
                    _icon,
                    size: 20,
                    color: _iconColor,
                  )),
              const SizedBox(width: DriverSpacing.md),
              Expanded(
                  child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                    Text(item.label,
                        style: const TextStyle(
                            fontSize: DriverTypography.bodyLarge,
                            color: DriverColors.labelText)),
                    if (item.detail != null)
                      Text(item.detail!,
                          style: const TextStyle(
                              fontSize: DriverTypography.caption,
                              color: DriverColors.warningText)),
                  ])),
              if (item.toggle)
                SvgPicture.asset('assets/profile-toggle.svg',
                    width: 44, height: 24)
              else
                SvgPicture.asset('assets/profile-chevron.svg',
                    width: 16, height: 16),
            ]),
          ),
        ),
      );
}

class _CardShell extends StatelessWidget {
  const _CardShell({required this.child});
  final Widget child;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
            color: DriverColors.surface,
            border: Border.all(color: DriverColors.divider),
            borderRadius: BorderRadius.circular(DriverRadii.card),
            boxShadow: const [
              BoxShadow(
                  color: Color(0x1238434a), blurRadius: 4, offset: Offset(0, 2))
            ]),
        child: child,
      );
}

class _LogoutButton extends StatelessWidget {
  const _LogoutButton({required this.onTap});
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Semantics(
        button: true,
        label: '登出帳號',
        child: InkWell(
          onTap: onTap,
          child: const Padding(
            padding: EdgeInsets.symmetric(vertical: 16),
            child: Center(
              child: Text(
                '登出帳號',
                style: TextStyle(
                  fontSize: DriverTypography.bodyLarge,
                  fontWeight: FontWeight.w700,
                  color: Color(0xffef4444),
                ),
              ),
            ),
          ),
        ),
      );
}
