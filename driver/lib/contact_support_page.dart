import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'dart:async';
import 'dart:math';

import 'core/api/driver_api_client.dart';
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
  final _messageScroll = ScrollController();
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
  int _refreshVersion = 0;

  String _senderLabel(String? senderType) => switch (senderType) {
        'DRIVER' => '我',
        'AGENT' || 'ADMIN' => '客服',
        _ => '未知發送者',
      };

  @override
  void initState() {
    super.initState();
    _draft.addListener(_onDraftChanged);
    _open();
    _timer = Timer.periodic(const Duration(seconds: 5), (_) => _refresh());
  }

  void _onDraftChanged() {
    if (mounted) setState(() {});
  }

  Future<void> _open() async {
    try {
      final conversation = await _api.openSupportConversation();
      if (!mounted) return;
      final previousConversationId = _conversationId;
      setState(() {
        _conversationId = conversation['id']?.toString();
        _loading = false;
        _error = null;
      });
      if (previousConversationId != null &&
          previousConversationId != _conversationId) {
        _pendingText = null;
        _pendingMessageId = null;
        _pendingConversationId = null;
      }
      await _refresh();
    } catch (error) {
      if (mounted) {
        setState(() {
          _loading = false;
          _error = error.toString();
        });
      }
    }
  }

  Future<void> _refresh() async {
    final id = _conversationId;
    if (id == null) return;
    final version = ++_refreshVersion;
    try {
      final messages = await _api.listSupportMessages(id);
      if (mounted && version == _refreshVersion && id == _conversationId) {
        final followLatest = !_messageScroll.hasClients ||
            _messageScroll.position.extentAfter <= DriverSpacing.xl * 2;
        final lastMessageId = _messages.isEmpty ? null : _messages.last['id'];
        setState(() {
          _messages = messages;
          _error = null;
        });
        if (followLatest &&
            messages.isNotEmpty &&
            messages.last['id'] != lastMessageId) {
          WidgetsBinding.instance.addPostFrameCallback((_) {
            if (mounted && _messageScroll.hasClients) {
              _messageScroll.jumpTo(_messageScroll.position.maxScrollExtent);
            }
          });
        }
      }
    } catch (error) {
      if (mounted && version == _refreshVersion && id == _conversationId) {
        setState(() => _error = error.toString());
      }
    }
  }

  Future<void> _send() async {
    final id = _conversationId;
    final text = _draft.text.trim();
    if (id == null || text.isEmpty || _sending) return;
    setState(() => _sending = true);
    try {
      if (_pendingText != text || _pendingConversationId != id) {
        _pendingText = text;
        _pendingConversationId = id;
        // A 32-bit shift evaluates to zero in Flutter Web's JavaScript runtime.
        _pendingMessageId =
            'm${DateTime.now().microsecondsSinceEpoch}${Random.secure().nextInt(0x7fffffff)}';
      }
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
  void dispose() {
    _timer?.cancel();
    _messageScroll.dispose();
    _draft.removeListener(_onDraftChanged);
    _draft.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        backgroundColor: DriverColors.background,
        body: SafeArea(
          child: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(
                  maxWidth: DriverDimensions.maxContentWidth),
              child: Container(
                decoration: const BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [DriverColors.shellAccent, DriverColors.background],
                    stops: [0.0, 0.26],
                  ),
                ),
                child: Column(children: [
                  Padding(
                    padding: const EdgeInsets.fromLTRB(
                        DriverSpacing.lg,
                        DriverDimensions.pageTopPadding,
                        DriverSpacing.lg,
                        DriverSpacing.md),
                    child: Row(children: [
                      IconButton(
                        onPressed: () => Navigator.of(context).maybePop(),
                        icon: const Icon(Icons.arrow_back_ios_new_rounded),
                        color: DriverColors.text,
                        tooltip: '返回',
                      ),
                      const SizedBox(width: DriverSpacing.sm),
                      const Text('聯繫客服',
                          style: TextStyle(
                              fontSize: DriverTypography.bodyLarge,
                              fontWeight: FontWeight.w700,
                              color: DriverColors.text)),
                    ]),
                  ),
                  Expanded(
                    child: ListView(
                      controller: _messageScroll,
                      padding: const EdgeInsets.fromLTRB(DriverSpacing.xl,
                          DriverSpacing.sm, DriverSpacing.xl, DriverSpacing.lg),
                      children: [
                        if (widget.trip != null) ...[
                          _SupportCard(
                              child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('關於此訂單／行程 · ${widget.trip!.statusLabel}',
                                  style: const TextStyle(
                                      fontSize: DriverTypography.body,
                                      fontWeight: FontWeight.w700,
                                      color: DriverColors.text)),
                              const SizedBox(height: DriverSpacing.sm),
                              SelectableText('訂單 ID：${widget.trip!.tripId}',
                                  style: const TextStyle(
                                      fontSize: DriverTypography.label,
                                      color: DriverColors.secondaryText)),
                              const SizedBox(height: DriverSpacing.xs),
                              const Text('訂單資料僅供參考，尚未關聯客服對話。',
                                  style: TextStyle(
                                      fontSize: DriverTypography.caption,
                                      color: DriverColors.mutedText)),
                            ],
                          )),
                          const SizedBox(height: DriverSpacing.lg),
                        ],
                        if (_messages.isEmpty && !_loading) ...[
                          _SupportCard(
                              child: Column(children: [
                            SvgPicture.asset('assets/profile-headphones.svg',
                                width: DriverSpacing.xl * 2,
                                height: DriverSpacing.xl * 2),
                            const SizedBox(height: DriverSpacing.sm),
                            const Text('您好，有甚麼可以幫您？',
                                style: TextStyle(
                                    fontSize: DriverTypography.bodyLarge,
                                    fontWeight: FontWeight.w700,
                                    color: DriverColors.text)),
                            const SizedBox(height: DriverSpacing.sm),
                            const Text('請輸入訂單、行程或帳戶問題。',
                                textAlign: TextAlign.center,
                                style: TextStyle(
                                    fontSize: DriverTypography.body,
                                    color: DriverColors.secondaryText)),
                          ])),
                          const SizedBox(height: DriverSpacing.lg),
                        ],
                        if (_loading) const Text('正在載入客服對話…'),
                        if (_error != null)
                          TextButton(
                              onPressed: _open,
                              child: Text('客服服務目前不可用：$_error。點此重試')),
                        for (final message in _messages) ...[
                          _SupportMessageBubble(
                            message: message,
                            senderLabel:
                                _senderLabel(message['senderType']?.toString()),
                          ),
                          const SizedBox(height: DriverSpacing.sm),
                        ],
                      ],
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.fromLTRB(DriverSpacing.xl,
                        DriverSpacing.md, DriverSpacing.xl, DriverSpacing.lg),
                    decoration: const BoxDecoration(
                        color: DriverColors.surface,
                        border: Border(
                            top: BorderSide(color: DriverColors.divider))),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('目前支援文字對話；圖片稍後開放。緊急事項請使用其他聯絡方式。',
                            style: TextStyle(
                                fontSize: DriverTypography.caption,
                                color: DriverColors.secondaryText)),
                        const SizedBox(height: DriverSpacing.sm),
                        Row(children: [
                          const _UnavailableAction('圖片'),
                          const SizedBox(width: DriverSpacing.sm),
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
                                borderSide: BorderSide.none,
                              ),
                            ),
                          )),
                          const SizedBox(width: DriverSpacing.sm),
                          FilledButton(
                            onPressed: _conversationId != null &&
                                    !_sending &&
                                    _draft.text.trim().isNotEmpty
                                ? _send
                                : null,
                            child: Text(_sending ? '發送中…' : '發送'),
                          ),
                        ]),
                      ],
                    ),
                  ),
                ]),
              ),
            ),
          ),
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

class _SupportMessageBubble extends StatelessWidget {
  const _SupportMessageBubble({
    required this.message,
    required this.senderLabel,
  });

  final Map<String, dynamic> message;
  final String senderLabel;

  String? _sentAtLabel() {
    final createdAt = DateTime.tryParse(message['createdAt']?.toString() ?? '');
    if (createdAt == null) return null;
    final local = createdAt.toLocal();
    String two(int value) => value.toString().padLeft(2, '0');
    return '${two(local.month)}/${two(local.day)} ${two(local.hour)}:${two(local.minute)}';
  }

  @override
  Widget build(BuildContext context) {
    final isMine = message['senderType'] == 'DRIVER';
    final sentAtLabel = _sentAtLabel();
    final alignment = isMine ? Alignment.centerRight : Alignment.centerLeft;
    final crossAxisAlignment =
        isMine ? CrossAxisAlignment.end : CrossAxisAlignment.start;
    return Align(
      alignment: alignment,
      child: ConstrainedBox(
        constraints: BoxConstraints(
          maxWidth: DriverDimensions.maxContentWidth - DriverSpacing.xl * 4,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: crossAxisAlignment,
          children: [
            if (!isMine) ...[
              Text(senderLabel,
                  style: const TextStyle(
                      fontSize: DriverTypography.caption,
                      color: DriverColors.secondaryText)),
              const SizedBox(height: DriverSpacing.xs),
            ],
            IntrinsicWidth(
              child: Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: DriverSpacing.lg,
                  vertical: DriverSpacing.md,
                ),
                decoration: BoxDecoration(
                  color: isMine
                      ? DriverColors.infoBackground
                      : DriverColors.surface,
                  border: Border.all(color: DriverColors.border),
                  borderRadius: BorderRadius.circular(DriverRadii.card),
                ),
                child: Text(message['text']?.toString() ?? '',
                    style: const TextStyle(
                        fontSize: DriverTypography.body,
                        color: DriverColors.text)),
              ),
            ),
            if (sentAtLabel != null) ...[
              const SizedBox(height: DriverSpacing.xs),
              Text(sentAtLabel,
                  textAlign: isMine ? TextAlign.end : TextAlign.start,
                  style: const TextStyle(
                      fontSize: DriverTypography.caption,
                      color: DriverColors.secondaryText)),
            ],
          ],
        ),
      ),
    );
  }
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
