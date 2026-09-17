import 'dart:async';

import 'package:flutter/material.dart';

import 'app/route_names.dart';
import 'core/api/driver_api_client.dart';
import 'core/navigation/driver_navigation.dart';
import 'package:driver_web/core/tokens/driver_tokens.dart';

class ReviewStatusPage extends StatefulWidget {
  const ReviewStatusPage({super.key});

  @override
  State<ReviewStatusPage> createState() => _ReviewStatusPageState();
}

class _ReviewStatusPageState extends State<ReviewStatusPage> {
  final _api = DriverApiClient.instance;
  Timer? _statusTimer;
  bool _loading = false;
  bool _approved = false;
  bool _checkingStatus = false;
  String? _error;

  Map<String, dynamic> get _driver => _api.currentDriver ?? const {};

  @override
  void initState() {
    super.initState();
    _approved = _api.isApproved;
    if (_approved) {
      _scheduleHomeNavigation();
    } else {
      _statusTimer = Timer.periodic(
        const Duration(seconds: 5),
        (_) => _checkStatus(),
      );
    }
  }

  @override
  void dispose() {
    _statusTimer?.cancel();
    super.dispose();
  }

  Future<void> _checkStatus() async {
    if (_checkingStatus || _approved) return;
    _checkingStatus = true;
    try {
      await _api.me();
      if (!mounted) return;
      if (_api.isApproved) {
        _showApprovalTransition();
      } else {
        setState(() {});
      }
    } on Object {
      // A background refresh must not interrupt the waiting screen.
    } finally {
      _checkingStatus = false;
    }
  }

  void _showApprovalTransition() {
    _statusTimer?.cancel();
    setState(() {
      _approved = true;
      _loading = false;
    });
    _scheduleHomeNavigation();
  }

  void _scheduleHomeNavigation() {
    Future<void>.delayed(const Duration(milliseconds: 1800), () {
      if (mounted && _approved) _enterHome();
    });
  }

  void _enterHome() {
    DriverNavigation.replaceAll(context, DriverRouteNames.home);
  }

  Future<void> _refresh() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      await _api.me();
      if (!mounted) return;
      if (_api.isApproved) {
        _showApprovalTransition();
      } else {
        setState(() {});
      }
    } on DriverApiException catch (error) {
      if (mounted) setState(() => _error = error.message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _logout() async {
    try {
      await _api.logout();
    } on Object {
      _api.clearSession();
    }
    if (mounted) DriverNavigation.replace(context, DriverRouteNames.login);
  }

  @override
  Widget build(BuildContext context) {
    if (_approved) return _buildApprovedTransition();

    final status = _driver['reviewStatus']?.toString() ?? 'PENDING';
    final isRevision = status == 'REVISION_REQUIRED';
    final isRejected = status == 'REJECTED';
    final title = isRevision
        ? '資料需要修改'
        : isRejected
            ? '註冊未通過'
            : '資料審核中';
    final message = isRevision
        ? '請依照審核原因修改資料並重新提交。'
        : isRejected
            ? '本次司機註冊已終止，無法重新提交。'
            : '後台完成審核前，暫時無法進入接單。';
    final reason = _driver['reviewReason']?.toString().trim() ?? '';

    return Scaffold(
      backgroundColor: DriverColors.background,
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(
                maxWidth: DriverDimensions.maxContentWidth),
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(DriverSpacing.xl),
              child: Container(
                padding: const EdgeInsets.all(DriverSpacing.xl),
                decoration: BoxDecoration(
                  color: DriverColors.surface,
                  border: Border.all(color: DriverColors.divider),
                  borderRadius: BorderRadius.circular(DriverRadii.card),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Icon(
                        isRevision
                            ? Icons.edit_note
                            : isRejected
                                ? Icons.block
                                : Icons.schedule,
                        size: 48,
                        color: isRejected
                            ? DriverColors.secondaryText
                            : DriverColors.primary),
                    const SizedBox(height: DriverSpacing.lg),
                    Text(title,
                        textAlign: TextAlign.center,
                        style: const TextStyle(
                            fontSize: 24,
                            fontWeight: FontWeight.w700,
                            color: DriverColors.text)),
                    const SizedBox(height: DriverSpacing.sm),
                    Text(message,
                        textAlign: TextAlign.center,
                        style: const TextStyle(
                            fontSize: DriverTypography.bodyLarge,
                            color: DriverColors.secondaryText)),
                    if (reason.isNotEmpty) ...[
                      const SizedBox(height: DriverSpacing.xl),
                      Container(
                        padding: const EdgeInsets.all(DriverSpacing.lg),
                        decoration: BoxDecoration(
                          color: DriverColors.warningBackground,
                          borderRadius:
                              BorderRadius.circular(DriverRadii.input),
                        ),
                        child: Text('審核原因：$reason',
                            style: const TextStyle(color: DriverColors.text)),
                      ),
                    ],
                    if (_error != null) ...[
                      const SizedBox(height: DriverSpacing.lg),
                      Text(_error!,
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                              color: DriverColors.secondaryText)),
                    ],
                    const SizedBox(height: DriverSpacing.xl),
                    if (isRevision)
                      SizedBox(
                          height: 52,
                          child: ElevatedButton(
                            onPressed: () => DriverNavigation.replace(
                                context, DriverRouteNames.registration,
                                arguments: _driver),
                            child: const Text('重新填寫資料'),
                          )),
                    if (!isRejected) ...[
                      const SizedBox(height: DriverSpacing.md),
                      SizedBox(
                          height: 48,
                          child: OutlinedButton(
                            onPressed: _loading ? null : _refresh,
                            child: Text(_loading ? '更新中...' : '重新載入狀態'),
                          )),
                    ],
                    const SizedBox(height: DriverSpacing.md),
                    TextButton(onPressed: _logout, child: const Text('登出')),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildApprovedTransition() {
    return Scaffold(
      backgroundColor: DriverColors.background,
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(
                maxWidth: DriverDimensions.maxContentWidth),
            child: Padding(
              padding: const EdgeInsets.all(DriverSpacing.xl),
              child: TweenAnimationBuilder<double>(
                duration: const Duration(milliseconds: 520),
                curve: Curves.easeOutBack,
                tween: Tween(begin: 0.88, end: 1),
                builder: (context, scale, child) => Opacity(
                  opacity: ((scale - 0.88) / 0.12).clamp(0, 1),
                  child: Transform.scale(scale: scale, child: child),
                ),
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(DriverSpacing.xl),
                  decoration: BoxDecoration(
                    color: DriverColors.surface,
                    border: Border.all(color: DriverColors.divider),
                    borderRadius: BorderRadius.circular(DriverRadii.card),
                    boxShadow: DriverShadows.card,
                  ),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        width: 72,
                        height: 72,
                        decoration: const BoxDecoration(
                          color: DriverColors.successBackground,
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(
                          Icons.check_rounded,
                          size: 44,
                          color: DriverColors.success,
                        ),
                      ),
                      const SizedBox(height: DriverSpacing.xl),
                      const Text(
                        '審核已通過',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontSize: 24,
                          fontWeight: FontWeight.w700,
                          color: DriverColors.text,
                        ),
                      ),
                      const SizedBox(height: DriverSpacing.sm),
                      const Text(
                        '司機帳戶已啟用，即將進入接單首頁。',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontSize: DriverTypography.bodyLarge,
                          color: DriverColors.secondaryText,
                        ),
                      ),
                      const SizedBox(height: DriverSpacing.xl),
                      SizedBox(
                        width: double.infinity,
                        height: 52,
                        child: ElevatedButton.icon(
                          onPressed: _enterHome,
                          icon: const Icon(Icons.arrow_forward_rounded),
                          label: const Text('進入接單'),
                        ),
                      ),
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
