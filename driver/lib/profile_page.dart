import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

import 'floating_nav_bar.dart';
import 'home_page.dart';
import 'order_hall_page.dart';

class ProfilePage extends StatelessWidget {
  const ProfilePage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xfff0f2f5),
      body: SafeArea(
        child: Align(
          alignment: Alignment.topCenter,
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 430),
            child: LayoutBuilder(
              builder: (context, constraints) {
                final width = constraints.maxWidth;
                return Stack(
                  children: [
                    Align(
                      alignment: Alignment.topCenter,
                      child: SizedBox(
                        width: width,
                        child: SingleChildScrollView(
                          padding: const EdgeInsets.fromLTRB(24, 24, 24, 140),
                          child: const Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              _ProfileHeader(),
                              SizedBox(height: 24),
                              _BalanceCard(),
                              SizedBox(height: 24),
                              _MenuCard(
                                title: '主要功能',
                                items: [
                                  _MenuItem('個人資料', 'assets/profile-user.svg',
                                      _IconTone.blue),
                                  _MenuItem(
                                      '車輛資料',
                                      'assets/profile-vehicle.svg',
                                      _IconTone.green),
                                  _MenuItem(
                                      '接單紀錄',
                                      'assets/profile-clipboard.svg',
                                      _IconTone.purple),
                                ],
                              ),
                              SizedBox(height: 24),
                              _MenuCard(
                                title: '收款設定',
                                items: [
                                  _MenuItem('收款幣種', 'assets/profile-fps.svg',
                                      _IconTone.orange,
                                      detail: '港幣 HKD、人民幣 CNY'),
                                  _MenuItem('微信支付', 'assets/profile-wechat.svg',
                                      _IconTone.green,
                                      detail: '已綁定：陳大文'),
                                  _MenuItem('支付寶', 'assets/profile-fps.svg',
                                      _IconTone.blue,
                                      detail: '未綁定'),
                                  _MenuItem('FPS 轉數快', 'assets/profile-fps.svg',
                                      _IconTone.green,
                                      detail: '已綁定：陳大文'),
                                ],
                              ),
                              SizedBox(height: 24),
                              _MenuCard(
                                title: '設定',
                                items: [
                                  _MenuItem('通知設定', 'assets/profile-bell.svg',
                                      _IconTone.blue),
                                  _MenuItem('語言設定', 'assets/profile-fps.svg',
                                      _IconTone.purple),
                                  _MenuItem('自動結算', 'assets/profile-fps.svg',
                                      _IconTone.orange,
                                      toggle: true),
                                  _MenuItem('結算方式', 'assets/profile-fps.svg',
                                      _IconTone.green),
                                ],
                              ),
                              SizedBox(height: 24),
                              _MenuCard(
                                title: '其他',
                                items: [
                                  _MenuItem('關於我們', 'assets/profile-fps.svg',
                                      _IconTone.blue),
                                  _MenuItem(
                                      '聯繫客服',
                                      'assets/profile-headphones.svg',
                                      _IconTone.purple),
                                ],
                              ),
                              SizedBox(height: 16),
                              _LogoutButton(),
                            ],
                          ),
                        ),
                      ),
                    ),
                    Positioned(
                      left: width > 60 ? 30 : 12,
                      right: width > 60 ? 30 : 12,
                      bottom: 16,
                      child: FloatingNavBar(
                        selectedIndex: 2,
                        onHomeTap: () => Navigator.of(context).pushReplacement(
                          MaterialPageRoute<void>(
                              builder: (_) => const HomePage()),
                        ),
                        onOrderTap: () => Navigator.of(context).pushReplacement(
                          MaterialPageRoute<void>(
                              builder: (_) => const OrderHallPage()),
                        ),
                      ),
                    ),
                  ],
                );
              },
            ),
          ),
        ),
      ),
    );
  }
}

class _ProfileHeader extends StatelessWidget {
  const _ProfileHeader();

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text('陳大文',
                style: TextStyle(
                    fontSize: 28,
                    fontWeight: FontWeight.w700,
                    color: Color(0xff1c1c2e))),
            Semantics(
              button: true,
              label: '通知',
              child: InkWell(
                onTap: () {},
                borderRadius: BorderRadius.circular(16),
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
              color: const Color(0xffebf9f1),
              borderRadius: BorderRadius.circular(100)),
          child: const Text('已認證司機',
              style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                  color: Color(0xff2b7a42))),
        ),
        const SizedBox(height: 8),
        const Text('香港 · 兩地牌 · 轎車',
            style: TextStyle(fontSize: 14, color: Color(0xff6b7280))),
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
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    color: Color(0xff1c1c2e))),
            const SizedBox(height: 12),
            Row(children: [
              const Expanded(
                  child: _BalanceTile(
                      label: '已結算',
                      value: '\$12,680',
                      background: Color(0xffedfaf0),
                      labelColor: Color(0xff338040),
                      valueColor: Color(0xff29a140))),
              const SizedBox(width: 12),
              const Expanded(
                  child: _BalanceTile(
                      label: '未結算',
                      value: '\$3,420',
                      background: Color(0xfffff5eb),
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
            color: background, borderRadius: BorderRadius.circular(12)),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(label, style: TextStyle(fontSize: 13, color: labelColor)),
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
      {this.detail, this.toggle = false});
  final String label;
  final String asset;
  final _IconTone tone;
  final String? detail;
  final bool toggle;
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
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                  color: Color(0xff1c1c2e))),
          const SizedBox(height: 12),
          for (var i = 0; i < items.length; i++) ...[
            _MenuRow(item: items[i]),
            if (i < items.length - 1)
              const Divider(
                  height: 1,
                  indent: 48,
                  endIndent: 0,
                  color: Color(0xffe5e7eb)),
          ],
        ]),
      );
}

class _MenuRow extends StatelessWidget {
  const _MenuRow({required this.item});
  final _MenuItem item;

  Color get _background => switch (item.tone) {
        _IconTone.blue => const Color(0xffeaf0ff),
        _IconTone.green => const Color(0xffecfdf3),
        _IconTone.purple => const Color(0xfff2edff),
        _IconTone.orange => const Color(0xfffff5eb),
      };

  @override
  Widget build(BuildContext context) => Semantics(
        button: true,
        label: item.label,
        child: InkWell(
          onTap: () {},
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
              const SizedBox(width: 12),
              Expanded(
                  child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                    Text(item.label,
                        style: const TextStyle(
                            fontSize: 16, color: Color(0xff38434a))),
                    if (item.detail != null)
                      Text(item.detail!,
                          style: const TextStyle(
                              fontSize: 12, color: Color(0xff6b7280))),
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
            color: Colors.white,
            border: Border.all(color: const Color(0xffe5e7eb)),
            borderRadius: BorderRadius.circular(16),
            boxShadow: const [
              BoxShadow(
                  color: Color(0x0a000000), blurRadius: 4, offset: Offset(0, 2))
            ]),
        child: child,
      );
}

class _LogoutButton extends StatelessWidget {
  const _LogoutButton();

  @override
  Widget build(BuildContext context) => Semantics(
        button: true,
        label: '登出帳號',
        child: InkWell(
          onTap: () {},
          child: const Padding(
            padding: EdgeInsets.symmetric(vertical: 16),
            child: Center(
              child: Text(
                '登出帳號',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                  color: Color(0xffef4444),
                ),
              ),
            ),
          ),
        ),
      );
}
