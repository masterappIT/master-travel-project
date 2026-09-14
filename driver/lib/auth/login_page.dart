import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

import '../app/route_names.dart';
import '../core/navigation/driver_navigation.dart';

import 'package:driver_web/core/tokens/driver_tokens.dart';

class LoginPage extends StatelessWidget {
  const LoginPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: DriverColors.background,
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
                    const SizedBox(height: DriverSpacing.xl),
                    const _VerificationCard(),
                    const SizedBox(height: DriverSpacing.xl),
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
              color: DriverColors.primary,
              borderRadius: BorderRadius.circular(20),
            ),
            alignment: Alignment.center,
            child: SvgPicture.asset('assets/car.svg', width: 32, height: 32),
          ),
          const SizedBox(height: DriverSpacing.lg),
          const Text('跨境出行',
              style: TextStyle(
                  fontSize: 28,
                  fontWeight: FontWeight.w700,
                  color: DriverColors.text),
              textAlign: TextAlign.center),
          const SizedBox(height: DriverSpacing.lg),
          const Text('司機端登入 / 註冊',
              style: TextStyle(
                  fontSize: DriverTypography.body,
                  color: DriverColors.secondaryText),
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
          const SizedBox(height: DriverSpacing.sm),
          Container(
            height: 50,
            padding: const EdgeInsets.symmetric(horizontal: 16),
            decoration: _fieldDecoration(),
            child: Row(children: [
              const Text('+852',
                  style: TextStyle(
                      fontSize: 15,
                      color: DriverColors.text,
                      fontWeight: FontWeight.w500)),
              const SizedBox(width: DriverSpacing.xs),
              const Text('▼',
                  style:
                      TextStyle(fontSize: 10, color: DriverColors.mutedText)),
              const SizedBox(width: DriverSpacing.md),
              Container(width: 1, height: 20, color: const Color(0xffd1d1d9)),
              const SizedBox(width: DriverSpacing.sm),
              const Expanded(
                  child: Text('請輸入手機號碼',
                      style: TextStyle(
                          fontSize: 15, color: DriverColors.secondaryText))),
            ]),
          ),
          const SizedBox(height: DriverSpacing.lg),
          const _FieldLabel('驗證碼'),
          const SizedBox(height: DriverSpacing.sm),
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
                        const SizedBox(height: DriverSpacing.md),
                        const _PrimaryButton(
                            label: '獲取驗證碼',
                            fontSize: DriverTypography.body,
                            fullWidth: true)
                      ],
                    )
                  : Row(children: [
                      Expanded(child: codeField),
                      const SizedBox(width: DriverSpacing.md),
                      const _PrimaryButton(
                          label: '獲取驗證碼', fontSize: DriverTypography.body),
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
              fontSize: DriverTypography.bodyLarge,
              fullWidth: true,
              onPressed: () => DriverNavigation.push(
                  context, DriverRouteNames.registration)),
          const SizedBox(height: DriverSpacing.lg),
          const Text.rich(
              TextSpan(text: '登入即代表您同意 ', children: [
                TextSpan(
                    text: '司機服務條款',
                    style: TextStyle(
                        fontWeight: FontWeight.w700,
                        color: DriverColors.primary)),
                TextSpan(text: ' 與 '),
                TextSpan(
                    text: '隱私政策',
                    style: TextStyle(
                        fontWeight: FontWeight.w700,
                        color: DriverColors.primary))
              ]),
              textAlign: TextAlign.center,
              style: TextStyle(
                  fontSize: DriverTypography.label,
                  color: DriverColors.secondaryText)),
          const SizedBox(height: DriverSpacing.lg),
          Row(children: [
            const Expanded(child: Divider(color: DriverColors.border)),
            const Padding(
                padding: EdgeInsets.symmetric(horizontal: 12),
                child: Text('或',
                    style: TextStyle(
                        fontSize: DriverTypography.label,
                        color: DriverColors.secondaryText))),
            const Expanded(child: Divider(color: DriverColors.border)),
          ]),
          const SizedBox(height: DriverSpacing.lg),
          _SocialButton(
              color: DriverColors.success,
              asset: 'assets/circle-x.svg',
              label: '微信登入'),
          const SizedBox(height: DriverSpacing.lg),
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
            border: Border.all(color: DriverColors.divider),
            borderRadius: BorderRadius.circular(DriverRadii.card),
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
          fontSize: DriverTypography.body,
          fontWeight: FontWeight.w500,
          color: DriverColors.text));
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
          style:
              const TextStyle(fontSize: 15, color: DriverColors.secondaryText),
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
            backgroundColor: DriverColors.activeBlue,
            foregroundColor: Colors.white,
            elevation: 8,
            shadowColor: const Color(0x33285cfc),
            shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(DriverRadii.card)),
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
            shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(DriverRadii.card)),
            padding: EdgeInsets.zero,
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              SvgPicture.asset(asset, width: 20, height: 20),
              const SizedBox(width: DriverSpacing.md),
              Text(label,
                  style: const TextStyle(
                      fontSize: DriverTypography.bodyLarge,
                      fontWeight: FontWeight.w700)),
            ],
          ),
        ),
      );
}

BoxDecoration _fieldDecoration() => BoxDecoration(
    color: Colors.white,
    border: Border.all(color: DriverColors.border),
    borderRadius: BorderRadius.circular(DriverRadii.input));
