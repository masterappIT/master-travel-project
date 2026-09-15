import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

import 'app/route_names.dart';
import 'core/api/driver_api_client.dart';
import 'core/layout/driver_page_shell.dart';
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
  String _hongKongMacauPhone = '+852 9123 4567';
  String _mainlandPhone = '+86 未填寫';

  @override
  void initState() {
    super.initState();
    _loadProfile();
  }

  Future<void> _loadProfile() async {
    try {
      final driver = await _api.me();
      if (!mounted) return;
      setState(() {
        _name = driver['name']?.toString() ?? _name;
        _hongKongMacauPhone =
            '${driver['phoneCountryCode'] ?? '+852'} ${driver['phone'] ?? ''}'
                .trim();
        _mainlandPhone = driver['mainlandPhone']?.toString() ?? _mainlandPhone;
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
          _ProfileHeader(name: _name, onNotification: _showNotifications),
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
            const _BalanceCard(),
            const SizedBox(height: DriverSpacing.xl),
            _MenuCard(
              title: '主要功能',
              items: [
                _MenuItem(
                  '個人資料',
                  'assets/profile-user.svg',
                  _IconTone.blue,
                  onTap: _openProfileEditor,
                ),
                _MenuItem(
                  '車輛資料',
                  'assets/profile-vehicle.svg',
                  _IconTone.green,
                  onTap: () =>
                      DriverNavigation.push(context, DriverRouteNames.vehicle),
                ),
                _MenuItem(
                  '接單紀錄',
                  'assets/profile-clipboard.svg',
                  _IconTone.purple,
                  onTap: () => DriverNavigation.push(
                      context, DriverRouteNames.orderHistory),
                ),
              ],
            ),
            const SizedBox(height: DriverSpacing.xl),
            _MenuCard(
              title: '收款設定',
              items: [
                _MenuItem('收款幣種', 'assets/profile-fps.svg', _IconTone.orange,
                    detail: '港幣 HKD、人民幣 CNY'),
                _MenuItem('微信支付', 'assets/profile-wechat.svg', _IconTone.green,
                    detail: '已綁定：$_name'),
                _MenuItem('支付寶', 'assets/profile-fps.svg', _IconTone.blue,
                    detail: '未綁定'),
                _MenuItem('FPS 轉數快', 'assets/profile-fps.svg', _IconTone.green,
                    detail: '已綁定：$_name'),
              ],
            ),
            const SizedBox(height: DriverSpacing.xl),
            _MenuCard(
              title: '設定',
              items: [
                _MenuItem('通知設定', 'assets/profile-bell.svg', _IconTone.blue),
                _MenuItem('語言設定', 'assets/profile-fps.svg', _IconTone.purple),
                _MenuItem('自動結算', 'assets/profile-fps.svg', _IconTone.orange,
                    toggle: true),
                _MenuItem('結算方式', 'assets/profile-fps.svg', _IconTone.green),
              ],
            ),
            const SizedBox(height: DriverSpacing.xl),
            _MenuCard(
              title: '其他',
              items: [
                _MenuItem('關於我們', 'assets/profile-fps.svg', _IconTone.blue),
                _MenuItem(
                    '聯繫客服', 'assets/profile-headphones.svg', _IconTone.purple),
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
  const _ProfileHeader({required this.name, required this.onNotification});

  final String name;
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
                borderRadius: BorderRadius.circular(DriverRadii.card),
                child: SvgPicture.asset('assets/profile-bell.svg',
                    width: 32, height: 32),
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
        const Text('香港 · 兩地牌 · 轎車',
            style: TextStyle(
                fontSize: DriverTypography.body,
                color: DriverColors.warningText)),
      ],
    );
  }
}

class _BalanceCard extends StatelessWidget {
  const _BalanceCard();

  @override
  Widget build(BuildContext context) => _CardShell(
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
              const Expanded(
                  child: _BalanceTile(
                      label: '已結算',
                      value: '\$12,680',
                      background: Color(0xffedfaf0),
                      labelColor: Color(0xff338040),
                      valueColor: Color(0xff29a140))),
              const SizedBox(width: DriverSpacing.md),
              const Expanded(
                  child: _BalanceTile(
                      label: '未結算',
                      value: '\$3,420',
                      background: DriverColors.warningBackground,
                      labelColor: Color(0xff99591a),
                      valueColor: Color(0xffd9801a))),
            ]),
          ],
        ),
      );
}

class _BalanceTile extends StatelessWidget {
  const _BalanceTile(
      {required this.label,
      required this.value,
      required this.background,
      required this.labelColor,
      required this.valueColor});
  final String label;
  final String value;
  final Color background;
  final Color labelColor;
  final Color valueColor;

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
          Text('HKD',
              style: TextStyle(
                  fontSize: 11, color: labelColor.withValues(alpha: .6))),
        ]),
      );
}

enum _IconTone { blue, green, purple, orange }

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
        _IconTone.blue => DriverColors.infoBackground,
        _IconTone.green => const Color(0xffecfdf3),
        _IconTone.purple => const Color(0xfff2edff),
        _IconTone.orange => DriverColors.warningBackground,
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
                  child: SvgPicture.asset(item.asset, width: 18, height: 18)),
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
