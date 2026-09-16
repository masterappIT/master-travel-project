import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

import '../app/route_names.dart';
import '../core/api/driver_api_client.dart';
import '../core/navigation/driver_navigation.dart';

import 'package:driver_web/core/tokens/driver_tokens.dart';

class LoginPage extends StatefulWidget {
  const LoginPage({super.key});

  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  static const _testLoginEnabled = bool.fromEnvironment('DRIVER_TEST_LOGIN');
  final _phoneController = TextEditingController();
  final _codeController = TextEditingController();
  final _api = DriverApiClient.instance;
  String? _challengeId;
  String? _error;
  bool _loading = false;

  @override
  void dispose() {
    _phoneController.dispose();
    _codeController.dispose();
    super.dispose();
  }

  Future<void> _requestCode() async {
    final phone = _phoneController.text.trim();
    if (phone.isEmpty) {
      setState(() => _error = '請輸入手機號碼');
      return;
    }
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final result =
          await _api.requestPhoneCode(countryCode: '+852', phoneNumber: phone);
      if (!mounted) return;
      setState(() => _challengeId = result['challengeId'] as String?);
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('驗證碼已發送')));
    } on DriverApiException catch (error) {
      if (mounted) setState(() => _error = error.message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _verify() async {
    final code = _codeController.text.trim();
    if (_challengeId == null) {
      setState(() => _error = '請先獲取驗證碼');
      return;
    }
    if (code.isEmpty) {
      setState(() => _error = '請輸入驗證碼');
      return;
    }
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      await _api.verifyPhoneCode(challengeId: _challengeId!, code: code);
      if (!mounted) return;
      DriverNavigation.replace(context, DriverRouteNames.home);
    } on DriverApiException catch (error) {
      if (mounted) setState(() => _error = error.message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

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
                padding:
                    const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
                child: ConstrainedBox(
                  constraints: BoxConstraints(
                    minHeight: constraints.maxHeight > 32
                        ? constraints.maxHeight - 32
                        : 0,
                  ),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      const _Header(),
                      const SizedBox(height: DriverSpacing.xl),
                      _VerificationCard(
                          phoneController: _phoneController,
                          codeController: _codeController,
                          onRequestCode: _requestCode,
                          loading: _loading),
                      if (_error != null) ...[
                        const SizedBox(height: DriverSpacing.sm),
                        Text(_error!,
                            style: const TextStyle(color: Colors.red),
                            textAlign: TextAlign.center),
                      ],
                      const SizedBox(height: DriverSpacing.xl),
                      _ActionCard(onLogin: _verify, loading: _loading),
                    ],
                  ),
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
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.fromLTRB(24, 28, 24, 24),
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            colors: [DriverColors.primaryDark, DriverColors.primary],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          borderRadius: BorderRadius.circular(DriverRadii.card),
          boxShadow: DriverShadows.floating,
        ),
        child: Stack(
          children: [
            Positioned(
              top: -42,
              right: -34,
              child: Container(
                width: 128,
                height: 128,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: DriverColors.onPrimary.withValues(alpha: .10),
                ),
              ),
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Image.asset(
                  'assets/master-app-logo.png',
                  width: 220,
                  height: 68,
                  fit: BoxFit.contain,
                  alignment: Alignment.centerLeft,
                  semanticLabel: 'Master App',
                ),
                const SizedBox(height: DriverSpacing.lg),
                Text('司機工作台 · 安全接送每一程',
                    style: TextStyle(
                        fontSize: DriverTypography.body,
                        color: DriverColors.onPrimary.withValues(alpha: .78))),
                const SizedBox(height: DriverSpacing.lg),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(
                    color: DriverColors.onPrimary.withValues(alpha: .12),
                    borderRadius: BorderRadius.circular(DriverRadii.pill),
                  ),
                  child: const Row(mainAxisSize: MainAxisSize.min, children: [
                    Icon(Icons.verified_user_outlined,
                        size: 16, color: DriverColors.onPrimary),
                    SizedBox(width: DriverSpacing.sm),
                    Text('專業司機專用入口',
                        style: TextStyle(
                            fontSize: DriverTypography.caption,
                            fontWeight: FontWeight.w700,
                            color: DriverColors.onPrimary)),
                  ]),
                ),
              ],
            ),
          ],
        ),
      );
}

class _VerificationCard extends StatelessWidget {
  const _VerificationCard(
      {required this.phoneController,
      required this.codeController,
      required this.onRequestCode,
      required this.loading});
  final TextEditingController phoneController;
  final TextEditingController codeController;
  final VoidCallback onRequestCode;
  final bool loading;

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
              Expanded(
                  child: TextField(
                      controller: phoneController,
                      keyboardType: TextInputType.phone,
                      decoration: const InputDecoration(
                          border: InputBorder.none, hintText: '請輸入手機號碼'))),
            ]),
          ),
          const SizedBox(height: DriverSpacing.lg),
          const _FieldLabel('驗證碼'),
          const SizedBox(height: DriverSpacing.sm),
          LayoutBuilder(
            builder: (context, constraints) {
              final codeField = SizedBox(
                  height: 50,
                  child: TextField(
                      controller: codeController,
                      keyboardType: TextInputType.number,
                      decoration: _inputDecoration('請輸入 5 位數簡訊驗證碼')));
              final compact = constraints.maxWidth < 350;
              final button = _PrimaryButton(
                  label: loading ? '處理中' : '獲取驗證碼',
                  fontSize: DriverTypography.body,
                  fullWidth: compact,
                  onPressed: loading ? null : onRequestCode);
              return compact
                  ? Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                          codeField,
                          const SizedBox(height: DriverSpacing.md),
                          button
                        ])
                  : Row(children: [
                      Expanded(child: codeField),
                      const SizedBox(width: DriverSpacing.md),
                      button
                    ]);
            },
          ),
        ],
      );
}

class _ActionCard extends StatelessWidget {
  const _ActionCard({required this.onLogin, required this.loading});
  final VoidCallback onLogin;
  final bool loading;

  @override
  Widget build(BuildContext context) => _Card(
        children: [
          _PrimaryButton(
              label: loading ? '登入中' : '登入 / 註冊',
              fontSize: DriverTypography.bodyLarge,
              fullWidth: true,
              onPressed: loading ? null : onLogin),
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
          Row(mainAxisAlignment: MainAxisAlignment.center, children: [
            _SocialLogo(
                asset: 'assets/login-wechat.svg',
                width: 45,
                height: 45,
                semanticLabel: '微信登入',
                onPressed: () => ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('此登入方式尚未開放，請使用手機驗證碼登入')))),
            const SizedBox(width: DriverSpacing.xl),
            _SocialLogo(
                asset: 'assets/login-apple.svg',
                width: 40,
                height: 40,
                semanticLabel: '以 Apple 登入',
                onPressed: () => ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('此登入方式尚未開放，請使用手機驗證碼登入')))),
          ]),
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
            color: DriverColors.surface,
            border: Border.all(color: DriverColors.divider),
            borderRadius: BorderRadius.circular(DriverRadii.card),
            boxShadow: DriverShadows.card),
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
        height: 56,
        child: ElevatedButton(
          onPressed: onPressed,
          style: ElevatedButton.styleFrom(
            backgroundColor: DriverColors.primary,
            disabledBackgroundColor:
                DriverColors.primary.withValues(alpha: .42),
            foregroundColor: DriverColors.onPrimary,
            disabledForegroundColor:
                DriverColors.onPrimary.withValues(alpha: .78),
            elevation: 0,
            shadowColor: Colors.transparent,
            shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(DriverRadii.input)),
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
          ).copyWith(
            overlayColor: WidgetStatePropertyAll(
                DriverColors.onPrimary.withValues(alpha: .12)),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              if (onPressed == null)
                const SizedBox(
                  width: 18,
                  height: 18,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: DriverColors.onPrimary,
                  ),
                ),
              if (onPressed == null) const SizedBox(width: DriverSpacing.sm),
              Text(label,
                  style: TextStyle(
                      fontSize: fontSize, fontWeight: FontWeight.w700)),
            ],
          ),
        ),
      );
}

class _SocialLogo extends StatelessWidget {
  const _SocialLogo({
    required this.asset,
    required this.width,
    required this.height,
    required this.semanticLabel,
    required this.onPressed,
  });
  final String asset;
  final double width;
  final double height;
  final String semanticLabel;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) => Semantics(
        button: true,
        label: semanticLabel,
        child: InkWell(
          onTap: onPressed,
          customBorder: const CircleBorder(),
          child: Padding(
            padding: const EdgeInsets.all(8),
            child: SvgPicture.asset(
              asset,
              width: width,
              height: height,
              semanticsLabel: semanticLabel,
            ),
          ),
        ),
      );
}

BoxDecoration _fieldDecoration() => BoxDecoration(
    color: DriverColors.surface,
    border: Border.all(color: DriverColors.border),
    borderRadius: BorderRadius.circular(DriverRadii.input));

InputDecoration _inputDecoration(String hint) => InputDecoration(
      hintText: hint,
      border: InputBorder.none,
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
    );
