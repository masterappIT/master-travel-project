import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'dart:async';
import 'dart:math';

import 'core/api/driver_api_client.dart';
import 'core/layout/driver_page_shell.dart';
import 'core/tokens/driver_tokens.dart';

class DriverSupportContext {
  const DriverSupportContext({required this.tripId, required this.statusLabel});
  final String tripId;
  final String statusLabel;
}

class ContactSupportPage extends StatefulWidget {
  const ContactSupportPage({super.key, this.trip});
  final DriverSupportContext? trip;

  @override
  State<ContactSupportPage> createState() => _ContactSupportPageState();
}

class _ContactSupportPageState extends State<ContactSupportPage> {
  final _draft = TextEditingController();
  final _api = DriverApiClient.instance;
  List<Map<String, dynamic>> _messages = [];
  String? _conversationId;
  String? _error;
  bool _loading = true;
  bool _sending = false;
  Timer? _timer;
  String? _pendingText;
  String? _pendingMessageId;
  String? _pendingConversationId;

  @override
  void initState() {
    super.initState();
    _open();
    _timer = Timer.periodic(const Duration(seconds: 5), (_) => _refresh());
  }

  Future<void> _open() async {
    try {
      final conversation = await _api.openSupportConversation();
      if (!mounted) return;
      final previousConversationId = _conversationId;
      setState(() { _conversationId = conversation['id']?.toString(); _loading = false; _error = null; });
      if (previousConversationId != null && previousConversationId != _conversationId) { _pendingText = null; _pendingMessageId = null; _pendingConversationId = null; }
      await _refresh();
    } catch (error) {
      if (mounted) setState(() { _loading = false; _error = error.toString(); });
    }
  }

  Future<void> _refresh() async {
    final id = _conversationId;
    if (id == null) return;
    try {
      final messages = await _api.listSupportMessages(id);
      if (mounted) setState(() { _messages = messages; _error = null; });
    } catch (error) {
      if (mounted) setState(() => _error = error.toString());
    }
  }

  Future<void> _send() async {
    final id = _conversationId;
    final text = _draft.text.trim();
    if (id == null || text.isEmpty || _sending) return;
    setState(() => _sending = true);
    if (_pendingText != text || _pendingConversationId != id) {
      _pendingText = text;
      _pendingConversationId = id;
      _pendingMessageId = 'm${DateTime.now().microsecondsSinceEpoch}${Random.secure().nextInt(1 << 32)}';
    }
    try {
      await _api.sendSupportMessage(id, text, _pendingMessageId!);
      _pendingText = null;
      _pendingMessageId = null;
      _pendingConversationId = null;
      _draft.clear();
      await _refresh();
    } catch (error) {
      if (mounted) setState(() => _error = error.toString());
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  void dispose() { _timer?.cancel(); _draft.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) => DriverPageShell(
        showBottomNavigation: false,
        selectedIndex: 2,
        bottomPadding: DriverSpacing.xl,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(children: [
              IconButton(
                onPressed: () => Navigator.of(context).maybePop(),
                icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 20),
                color: DriverColors.text,
                tooltip: '返回',
              ),
              const SizedBox(width: DriverSpacing.sm),
              const Text('聯繫客服',
                  style: TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.w700,
                      color: DriverColors.text)),
            ]),
            const SizedBox(height: DriverSpacing.xl),
            if (widget.trip != null) ...[
              _SupportCard(
                  child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Wrap(
                    alignment: WrapAlignment.spaceBetween,
                    crossAxisAlignment: WrapCrossAlignment.center,
                    spacing: DriverSpacing.sm,
                    runSpacing: DriverSpacing.sm,
                    children: [
                      const Text('關於此訂單／行程',
                          style: TextStyle(
                              fontSize: DriverTypography.bodyLarge,
                              fontWeight: FontWeight.w700,
                              color: DriverColors.text)),
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: DriverSpacing.md,
                            vertical: DriverSpacing.xs),
                        decoration: BoxDecoration(
                            color: DriverColors.infoBackground,
                            borderRadius:
                                BorderRadius.circular(DriverRadii.pill)),
                      child: Text(widget.trip!.statusLabel,
                            style: const TextStyle(
                                fontSize: DriverTypography.caption,
                                color: DriverColors.activeBlue)),
                      ),
                    ],
                  ),
                  const SizedBox(height: DriverSpacing.sm),
                  SelectableText('訂單 ID：${widget.trip!.tripId}',
                      style: const TextStyle(
                          fontSize: DriverTypography.label,
                          color: DriverColors.secondaryText)),
                  const SizedBox(height: DriverSpacing.sm),
                  const Text('此處僅顯示頁面資訊；訂單關聯尚待後端核對。',
                      style: TextStyle(
                          fontSize: DriverTypography.caption,
                          color: DriverColors.mutedText)),
                ],
              )),
              const SizedBox(height: DriverSpacing.lg),
            ],
            _SupportCard(
                child: Column(children: [
              SvgPicture.asset('assets/profile-headphones.svg',
                  width: DriverSpacing.xl * 2, height: DriverSpacing.xl * 2),
              const SizedBox(height: DriverSpacing.lg),
              const Text('您好，有甚麼可以幫您？',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                      fontSize: DriverTypography.bodyLarge,
                      fontWeight: FontWeight.w700,
                      color: DriverColors.text)),
              const SizedBox(height: DriverSpacing.sm),
              const Text('在這裡與客服人員交流訂單、行程與帳戶問題。',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                      fontSize: DriverTypography.body,
                      height: 1.5,
                      color: DriverColors.secondaryText)),
            ])),
            const SizedBox(height: DriverSpacing.lg),
            if (_messages.isNotEmpty) ..._messages.map((message) => _SupportCard(child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [Text(message['text']?.toString() ?? ''), const SizedBox(height: DriverSpacing.xs), Text(message['senderType']?.toString() ?? '')],
            ))),
            if (_loading) const Text('正在載入客服對話…'),
            if (_error != null) TextButton(onPressed: _open, child: Text('客服服務目前不可用：$_error。點此重試')),
            Semantics(
              liveRegion: true,
              child: Container(
                padding: const EdgeInsets.all(DriverSpacing.lg),
                decoration: BoxDecoration(
                    color: DriverColors.infoBackground,
                    border: Border.all(color: DriverColors.border),
                    borderRadius: BorderRadius.circular(DriverRadii.card)),
                child: const Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('客服文字對話',
                          style: TextStyle(
                              fontSize: DriverTypography.body,
                              fontWeight: FontWeight.w700,
                              color: DriverColors.activeBlue)),
                      SizedBox(height: DriverSpacing.sm),
                      Text('文字訊息已開放；圖片稍後接入。請勿在此輸入緊急事項。',
                          style: TextStyle(
                              fontSize: DriverTypography.label,
                              height: 1.5,
                              color: DriverColors.secondaryText)),
                    ]),
              ),
            ),
            const SizedBox(height: DriverSpacing.xl),
            _SupportCard(
                child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                  const Wrap(
                      spacing: DriverSpacing.sm,
                      runSpacing: DriverSpacing.sm,
                      children: [
                        _UnavailableAction('圖片'),
                      ]),
                  const SizedBox(height: DriverSpacing.md),
                  Row(children: [
                    Expanded(
                        child: TextField(
                      controller: _draft,
                      enabled: _conversationId != null && !_sending,
                      onSubmitted: (_) => _send(),
                      decoration: InputDecoration(
                        hintText: '輸入訊息',
                        filled: true,
                        fillColor: DriverColors.background,
                        border: OutlineInputBorder(
                            borderRadius:
                                BorderRadius.circular(DriverRadii.input),
                            borderSide: BorderSide.none),
                      ),
                    )),
                    const SizedBox(width: DriverSpacing.sm),
                    FilledButton(onPressed: _conversationId != null && !_sending ? _send : null, child: const Text('發送')),
                  ]),
                ])),
          ],
        ),
      );
}

class _UnavailableAction extends StatelessWidget {
  const _UnavailableAction(this.label);
  final String label;

  @override
  Widget build(BuildContext context) => OutlinedButton(
        onPressed: null,
        style: OutlinedButton.styleFrom(
            shape: const StadiumBorder(),
            padding: const EdgeInsets.symmetric(horizontal: DriverSpacing.md)),
        child: Text(label,
            style: const TextStyle(fontSize: DriverTypography.label)),
      );
}

class _SupportCard extends StatelessWidget {
  const _SupportCard({required this.child});
  final Widget child;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(DriverSpacing.lg),
        decoration: BoxDecoration(
            color: DriverColors.surface,
            border: Border.all(color: DriverColors.divider),
            borderRadius: BorderRadius.circular(DriverRadii.card)),
        child: child,
      );
}
