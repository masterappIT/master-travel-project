import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'core/tokens/driver_tokens.dart';

class DriverPhoneVerificationDialog extends StatefulWidget {
  const DriverPhoneVerificationDialog(
      {super.key,
      required this.phone,
      required this.verify,
      required this.resend});

  final String phone;
  final Future<void> Function(String code) verify;
  final Future<void> Function() resend;

  @override
  State<DriverPhoneVerificationDialog> createState() =>
      _DriverPhoneVerificationDialogState();
}

class _DriverPhoneVerificationDialogState
    extends State<DriverPhoneVerificationDialog> {
  final _code = TextEditingController();
  bool _busy = false;
  String? _error;
  Timer? _timer;
  int _remaining = 60;
  bool _resending = false;

  @override
  void initState() {
    super.initState();
    _startCountdown();
  }

  void _startCountdown() {
    _timer?.cancel();
    _remaining = 60;
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      final remaining = (60 - timer.tick).clamp(0, 60);
      setState(() => _remaining = remaining);
      if (remaining == 0) timer.cancel();
    });
  }

  Future<void> _resend() async {
    if (_busy || _remaining > 0) return;
    setState(() {
      _busy = true;
      _resending = true;
      _error = null;
    });
    try {
      await widget.resend();
      if (!mounted) return;
      _code.clear();
      setState(_startCountdown);
    } catch (error) {
      if (mounted) setState(() => _error = error.toString());
    } finally {
      if (mounted) {
        setState(() {
          _busy = false;
          _resending = false;
        });
      }
    }
  }

  @override
  void dispose() {
    _timer?.cancel();
    _code.dispose();
    super.dispose();
  }

  Future<void> _verify() async {
    if (_busy) return;
    if (_code.text.trim().length != 5) {
      setState(() => _error = '請輸入 5 位驗證碼');
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await widget.verify(_code.text.trim());
      if (mounted) {
        Navigator.of(context).pop(true);
      }
    } catch (error) {
      if (mounted) {
        setState(() {
          _busy = false;
          _error = error.toString();
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) => PopScope(
        canPop: !_busy,
        child: AlertDialog(
          title: const Text('驗證新電話'),
          content: SingleChildScrollView(
            child: Column(mainAxisSize: MainAxisSize.min, children: [
              Text('請輸入 ${widget.phone} 的驗證碼'),
              const SizedBox(height: DriverSpacing.md),
              TextField(
                controller: _code,
                enabled: !_busy,
                autofocus: true,
                keyboardType: TextInputType.number,
                inputFormatters: [
                  FilteringTextInputFormatter.digitsOnly,
                  LengthLimitingTextInputFormatter(5)
                ],
                decoration:
                    InputDecoration(labelText: '驗證碼', errorText: _error),
                onSubmitted: (_) => _verify(),
              ),
              TextButton(
                onPressed: _busy || _remaining > 0 ? null : _resend,
                child: Text(_resending
                    ? '獲取中…'
                    : _remaining > 0
                        ? '$_remaining 秒後可重新獲取'
                        : '重新獲取驗證碼'),
              ),
            ]),
          ),
          actions: [
            TextButton(
                onPressed:
                    _busy ? null : () => Navigator.of(context).pop(false),
                child: const Text('取消')),
            TextButton(
                onPressed: _busy ? null : _verify,
                child: Text(_busy && !_resending ? '驗證中…' : '確認驗證')),
          ],
        ),
      );
}
