import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

import '../app/router.dart';
import '../core/navigation/driver_navigation.dart';

class LoginPage extends StatelessWidget {
  const LoginPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xfff0f2f5),
      body: SafeArea(
        child: LayoutBuilder(
          builder: (context, constraints) => Align(
            alignment: Alignment.topCenter,
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 430),
              child: SingleChildScrollView(
                padding: const EdgeInsets.fromLTRB(24, 24, 24, 8),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const _Header(),
                    const SizedBox(height: 24),
                    const _VerificationCard(),
                    const SizedBox(height: 24),
                    const _ActionCard(),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _Header extends StatelessWidget {
  const _Header();

  @override
  Widget build(BuildContext context) => Column(
        children: [
          Container(
            width: 72,
            height: 72,
            decoration: BoxDecoration(
              color: const Color(0xff4a6cf7),
              borderRadius: BorderRadius.circular(20),
            ),
            alignment: Alignment.center,
            child: SvgPicture.asset('assets/car.svg', width: 32, height: 32),
          ),
          const SizedBox(height: 16),
          const Text('跨境出行',
              style: TextStyle(
                  fontSize: 28,
                  fontWeight: FontWeight.w700,
                  color: Color(0xff1c1c2e)),
              textAlign: TextAlign.center),
          const SizedBox(height: 16),
          const Text('司機端登入 / 註冊',
              style: TextStyle(fontSize: 14, color: Color(0xff56657e)),
              textAlign: TextAlign.center),
        ],
      );
}

class _VerificationCard extends StatelessWidget {
  const _VerificationCard();

  @override
  Widget build(BuildContext context) => _Card(
        children: [
          const _FieldLabel('手機號碼'),
          const SizedBox(height: 8),
          Container(
            height: 50,
            padding: const EdgeInsets.symmetric(horizontal: 16),
            decoration: _fieldDecoration(),
            child: Row(children: [
              const Text('+852',
                  style: TextStyle(
                      fontSize: 15,
                      color: Color(0xff1c1c2e),
                      fontWeight: FontWeight.w500)),
              const SizedBox(width: 4),
              const Text('▼',
                  style: TextStyle(fontSize: 10, color: Color(0xff80808c))),
              const SizedBox(width: 12),
              Container(width: 1, height: 20, color: const Color(0xffd1d1d9)),
              const SizedBox(width: 8),
              const Expanded(
                  child: Text('請輸入手機號碼',
                      style:
                          TextStyle(fontSize: 15, color: Color(0xff56657e)))),
            ]),
          ),
          const SizedBox(height: 16),
          const _FieldLabel('驗證碼'),
          const SizedBox(height: 8),
          LayoutBuilder(
            builder: (context, constraints) {
              final codeField = const SizedBox(
                  height: 50, child: _InputHint('請輸入 6 位數簡訊驗證碼'));
              final compact = constraints.maxWidth < 350;
              return compact
                  ? Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        codeField,
                        const SizedBox(height: 12),
                        const _PrimaryButton(
                            label: '獲取驗證碼', fontSize: 14, fullWidth: true)
                      ],
                    )
                  : Row(children: [
                      Expanded(child: codeField),
                      const SizedBox(width: 12),
                      const _PrimaryButton(label: '獲取驗證碼', fontSize: 14),
                    ]);
            },
          ),
        ],
      );
}

class _ActionCard extends StatelessWidget {
  const _ActionCard();

  @override
  Widget build(BuildContext context) => _Card(
        children: [
          _PrimaryButton(
              label: '登入 / 註冊',
              fontSize: 16,
              fullWidth: true,
              onPressed: () =>
                  DriverNavigation.push(context, DriverRoutes.registration)),
          const SizedBox(height: 16),
          const Text.rich(
              TextSpan(text: '登入即代表您同意 ', children: [
                TextSpan(
                    text: '司機服務條款',
                    style: TextStyle(
                        fontWeight: FontWeight.w700, color: Color(0xff4a6cf7))),
                TextSpan(text: ' 與 '),
                TextSpan(
                    text: '隱私政策',
                    style: TextStyle(
                        fontWeight: FontWeight.w700, color: Color(0xff4a6cf7)))
              ]),
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 13, color: Color(0xff56657e))),
          const SizedBox(height: 16),
          Row(children: [
            const Expanded(child: Divider(color: Color(0xffd9d9d9))),
            const Padding(
                padding: EdgeInsets.symmetric(horizontal: 12),
                child: Text('或',
                    style: TextStyle(fontSize: 13, color: Color(0xff56657e)))),
            const Expanded(child: Divider(color: Color(0xffd9d9d9))),
          ]),
          const SizedBox(height: 16),
          _SocialButton(
              color: const Color(0xff4cd964),
              asset: 'assets/circle-x.svg',
              label: '微信登入'),
          const SizedBox(height: 16),
          _SocialButton(
              color: const Color(0xff1a1a1a),
              asset: 'assets/apple.svg',
              label: '以 Apple 登入'),
        ],
      );
}

class _Card extends StatelessWidget {
  const _Card({required this.children});
  final List<Widget> children;
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
        child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch, children: children),
      );
}

class _FieldLabel extends StatelessWidget {
  const _FieldLabel(this.label);
  final String label;
  @override
  Widget build(BuildContext context) => Text(label,
      style: const TextStyle(
          fontSize: 14, fontWeight: FontWeight.w500, color: Color(0xff1c1c2e)));
}

class _InputHint extends StatelessWidget {
  const _InputHint(this.label);
  final String label;
  @override
  Widget build(BuildContext context) => Container(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      alignment: Alignment.centerLeft,
      decoration: _fieldDecoration(),
      child: Text(label,
          style: const TextStyle(fontSize: 15, color: Color(0xff56657e)),
          overflow: TextOverflow.ellipsis));
}

class _PrimaryButton extends StatelessWidget {
  const _PrimaryButton(
      {required this.label,
      required this.fontSize,
      this.fullWidth = false,
      this.onPressed});
  final String label;
  final double fontSize;
  final bool fullWidth;
  final VoidCallback? onPressed;
  @override
  Widget build(BuildContext context) => SizedBox(
        width: fullWidth ? double.infinity : null,
        height: 52,
        child: ElevatedButton(
          onPressed: onPressed ?? () {},
          style: ElevatedButton.styleFrom(
            backgroundColor: const Color(0xff285cfc),
            foregroundColor: Colors.white,
            elevation: 8,
            shadowColor: const Color(0x33285cfc),
            shape:
                RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
          ),
          child: Text(label,
              style:
                  TextStyle(fontSize: fontSize, fontWeight: FontWeight.w700)),
        ),
      );
}

class _SocialButton extends StatelessWidget {
  const _SocialButton(
      {required this.color, required this.asset, required this.label});
  final Color color;
  final String asset;
  final String label;
  @override
  Widget build(BuildContext context) => SizedBox(
        height: 52,
        width: double.infinity,
        child: ElevatedButton(
          onPressed: () {},
          style: ElevatedButton.styleFrom(
            backgroundColor: color,
            foregroundColor: Colors.white,
            elevation: 0,
            shape:
                RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            padding: EdgeInsets.zero,
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              SvgPicture.asset(asset, width: 20, height: 20),
              const SizedBox(width: 12),
              Text(label,
                  style: const TextStyle(
                      fontSize: 16, fontWeight: FontWeight.w700)),
            ],
          ),
        ),
      );
}

BoxDecoration _fieldDecoration() => BoxDecoration(
    color: Colors.white,
    border: Border.all(color: const Color(0xffd9d9d9)),
    borderRadius: BorderRadius.circular(12));
