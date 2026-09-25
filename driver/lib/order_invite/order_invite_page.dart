import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../core/api/driver_api_client.dart';
import '../core/platform/browser_image_picker.dart';
import '../core/tokens/driver_tokens.dart';
import '../core/vehicle_plate_rules.dart';
import 'order_invite_api_client.dart';
import 'order_invite_recognition.dart';
import 'order_invite_session_store.dart';
import 'order_invite_seo.dart';

List<String> orderInvitePlateLabels(String ownership, String plateType) {
  if (plateType == '三地牌') {
    return [
      '香港車牌',
      ownership == '香港' ? '澳門車牌（選填）' : '澳門車牌',
      '內地車牌',
    ];
  }
  if (plateType == '兩地牌') {
    if (ownership == '中國內地') return const ['內地車牌', '香港車牌'];
    return ['$ownership車牌', '內地車牌'];
  }
  return [ownership == '中國內地' ? '內地車牌' : '$ownership車牌'];
}

class OrderInvitePage extends StatefulWidget {
  const OrderInvitePage({
    super.key,
    this.token,
    this.api,
    this.recognition,
    this.sessionStore,
  });

  final String? token;
  final OrderInviteApiClient? api;
  final OrderInviteRecognitionAdapter? recognition;
  final OrderInviteSessionStore? sessionStore;

  @override
  State<OrderInvitePage> createState() => _OrderInvitePageState();
}

class _OrderInvitePageState extends State<OrderInvitePage> {
  late final OrderInviteApiClient _api = widget.api ?? OrderInviteApiClient();
  late final OrderInviteRecognitionAdapter _recognition =
      widget.recognition ?? LocalOrderInviteRecognitionAdapter();
  late final OrderInviteSessionStore _sessionStore =
      widget.sessionStore ?? BrowserOrderInviteSessionStore();
  final _name = TextEditingController();
  final _phone = TextEditingController();
  final _code = TextEditingController(text: '00000');
  final _hkMacauPhone = TextEditingController();
  final _mainlandPhone = TextEditingController();
  final _hkPlate = TextEditingController();
  final _macauPlate = TextEditingController();
  final _mainlandPlate = TextEditingController();
  final _vehicleCategory = TextEditingController();
  final _vehicleColor = TextEditingController();
  final _settlementAccount = TextEditingController();
  String _settlementMethod = '微信支付';
  String _countryCode = '+852';
  String _hkMacauCountryCode = '+852';
  String _ownership = '香港';
  String _plateType = '兩地牌';
  String? _challengeId;
  String? _provisionalSessionToken;
  Map<String, dynamic>? _preview;
  Map<String, dynamic>? _trip;
  List<String> _categories = const [];
  Uint8List? _photoBytes;
  String? _photoName;
  String? _photoMime;
  int _step = 0;
  bool _busy = false;
  bool _formalReviewSubmitted = false;
  String? _error;

  late final String _token = widget.token ??
      Uri.base.queryParameters['token'] ??
      Uri.tryParse(Uri.base.fragment)?.queryParameters['token'] ??
      '';

  bool get _previewMode =>
      Uri.base.queryParameters['preview'] == '1' ||
      Uri.base.path.endsWith('/order-invite-preview');
  @override
  void initState() {
    super.initState();
    setOrderInviteSeo('MasterApp｜司機端 ｜邀請接單');
    _load();
  }

  Future<void> _load() async {
    if (_token.isEmpty) {
      setState(() => _error = '邀請連結無效');
      return;
    }
    try {
      final results =
          await Future.wait([_api.details(_token), _api.vehicleCatalog()]);
      if (!mounted) return;
      final categories = results[1]['categories'];
      final invitation = results[0]['invitation'];
      final invitationId =
          invitation is Map ? invitation['id']?.toString() : null;
      final storedSession =
          invitationId == null ? null : _sessionStore.read(invitationId);
      setState(() {
        _preview = results[0];
        _provisionalSessionToken = storedSession;
        _categories = categories is List
            ? categories
                .whereType<Map>()
                .where((item) => item['enabled'] != false)
                .map((item) => item['name']?.toString() ?? '')
                .where((name) => name.isNotEmpty)
                .toList()
            : const [];
      });
      if (storedSession != null) {
        await _restoreSession(storedSession, invitationId!);
      }
    } on OrderInviteApiException catch (error) {
      if (mounted) setState(() => _error = error.message);
    }
  }

  Future<void> _restoreSession(String sessionToken, String invitationId) async {
    try {
      final trip = await _api.session(_token, sessionToken);
      if (!mounted) return;
      setState(() {
        _trip = trip;
        _step = 3;
      });
    } on OrderInviteApiException catch (error) {
      if (error.statusCode == 401 || error.statusCode == 403) {
        _sessionStore.remove(invitationId);
        if (mounted) setState(() => _provisionalSessionToken = null);
        return;
      }
      rethrow;
    }
  }

  String? get _invitationId {
    final invitation = _preview?['invitation'];
    return invitation is Map ? invitation['id']?.toString() : null;
  }

  Future<void> _requestCode() async {
    final expected = _countryCode == '+86' ? 11 : 8;
    if (!RegExp(r'^\d+$').hasMatch(_phone.text) ||
        _phone.text.length != expected) {
      _notice('請輸入 $expected 位手機號碼');
      return;
    }
    await _run(() async {
      final result = await _api.requestCode(_token,
          countryCode: _countryCode, phoneNumber: _phone.text);
      _challengeId = result['challengeId']?.toString();
      final developmentCode = result['developmentCode']?.toString();
      if (developmentCode != null) _code.text = developmentCode;
      _notice(developmentCode == null ? '驗證碼已發送' : '開發環境驗證碼：$developmentCode');
    });
  }

  Future<void> _verifyCode() async {
    if (_challengeId == null || _code.text.trim().length != 5) {
      _notice('請先取得並輸入 5 位驗證碼');
      return;
    }
    await _run(() async {
      await _api.verifyCode(_token,
          challengeId: _challengeId!, code: _code.text.trim());
      if (_countryCode == '+86') {
        _mainlandPhone.text = _phone.text;
      } else {
        _hkMacauCountryCode = _countryCode;
        _hkMacauPhone.text = _phone.text;
      }
      setState(() => _step = 2);
    });
  }

  Future<void> _pickPhoto() async {
    final image = await pickBrowserImage();
    if (image == null || !mounted) return;
    setState(() {
      _photoBytes = image.bytes;
      _photoName = image.compressed ? '${image.fileName}.jpg' : image.fileName;
      _photoMime = image.mimeType;
    });
  }

  Future<void> _pasteRecognition() async {
    final data = await Clipboard.getData(Clipboard.kTextPlain);
    final recognized = _recognition.recognizeText(data?.text ?? '');
    if (!mounted) return;
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('確認識別結果'),
        content: const Text('識別內容只會填入欄位，提交前請逐項核對。'),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('取消')),
          FilledButton(
              onPressed: () => Navigator.pop(context, true),
              child: const Text('填入')),
        ],
      ),
    );
    if (confirmed != true) return;
    setState(() {
      if (recognized.name?.isNotEmpty == true) {
        _name.text = recognized.name!;
      }
      if (recognized.hkPlate?.isNotEmpty == true) {
        _hkPlate.text = recognized.hkPlate!;
      }
      if (recognized.macauPlate?.isNotEmpty == true) {
        _macauPlate.text = recognized.macauPlate!;
      }
      if (recognized.mainlandPlate?.isNotEmpty == true) {
        _mainlandPlate.text =
            mainlandPlateInput(recognized.mainlandPlate!, _ownership);
      }
      if (recognized.vehicleColor?.isNotEmpty == true) {
        _vehicleColor.text = recognized.vehicleColor!;
      }
    });
  }

  Future<void> _submit() async {
    final mainlandPlate = composeMainlandPlate(_mainlandPlate.text, _ownership);
    final requiresHk =
        _ownership == '香港' || _ownership == '中國內地' || _plateType == '三地牌';
    final requiresMacau = _ownership == '澳門';
    final requiresMainland = _plateType != '單牌';
    if (_name.text.trim().isEmpty ||
        !RegExp(r'^\d{8}$').hasMatch(_hkMacauPhone.text.trim()) ||
        !RegExp(r'^\d{11}$').hasMatch(_mainlandPhone.text.trim()) ||
        (requiresHk && _hkPlate.text.trim().isEmpty) ||
        (requiresMacau && _macauPlate.text.trim().isEmpty) ||
        (requiresMainland && _mainlandPlate.text.trim().isEmpty) ||
        _vehicleCategory.text.trim().isEmpty ||
        _vehicleColor.text.trim().isEmpty ||
        _photoBytes == null) {
      _notice('請完成所有必填資料');
      return;
    }
    final plateError = vehiclePlateError(
      vehicleOwnership: _ownership,
      hongKongPlate: _hkPlate.text,
      macauPlate: _macauPlate.text,
      mainlandPlate: mainlandPlate,
    );
    if (plateError != null) {
      _notice(plateError);
      return;
    }
    await _run(() async {
      final result = await _api.registerAndAccept(
        token: _token,
        fields: {
          'name': _name.text.trim(),
          'phoneCountryCode': _countryCode,
          'phone': _phone.text.trim(),
          'hongKongMacauCountryCode': _hkMacauCountryCode,
          'hongKongMacauPhone': _hkMacauPhone.text.trim(),
          'mainlandPhone': _mainlandPhone.text.trim(),
          'vehicleOwnership': _ownership,
          'plateType': _plateType,
          'hkPlate': normalizeHongKongPlate(_hkPlate.text),
          'macauPlate': normalizeMacauPlate(_macauPlate.text),
          'mainlandPlate': normalizeMainlandPlate(mainlandPlate),
          'vehicleCategory': _vehicleCategory.text.trim(),
          'vehicleColor': _vehicleColor.text.trim(),
          'challengeId': _challengeId!,
          'code': _code.text.trim(),
        },
        vehiclePhotoBytes: _photoBytes!,
        vehiclePhotoFilename: _photoName!,
        vehiclePhotoMime: _photoMime!,
      );
      final sessionToken = result['token']?.toString();
      final invitationId = _invitationId;
      if (sessionToken == null ||
          sessionToken.isEmpty ||
          invitationId == null) {
        throw const OrderInviteApiException(502, '伺服器回應缺少臨時身份資料');
      }
      _sessionStore.write(invitationId, sessionToken);
      final trip = await _api.session(_token, sessionToken);
      setState(() {
        _provisionalSessionToken = sessionToken;
        _trip = trip;
        _step = 3;
      });
    });
  }

  Future<void> _runTripAction(
      Future<Map<String, dynamic>> Function(String, String) action) async {
    final sessionToken = _provisionalSessionToken;
    if (sessionToken == null) return;
    await _run(() async {
      final trip = await action(_token, sessionToken);
      if (mounted) setState(() => _trip = trip);
    });
  }

  Future<void> _cancelTrip() async {
    final sessionToken = _provisionalSessionToken;
    if (sessionToken == null) return;
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('取消訂單？'),
        content: const Text('行程開始後不可取消。確認取消本次訂單？'),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(dialogContext, false),
              child: const Text('返回')),
          FilledButton(
              onPressed: () => Navigator.pop(dialogContext, true),
              child: const Text('確認取消')),
        ],
      ),
    );
    if (confirmed != true) return;
    await _run(() async {
      final trip = await _api.cancel(_token, sessionToken);
      if (mounted) setState(() => _trip = trip);
    });
  }

  Future<void> _completeTrip() async {
    final sessionToken = _provisionalSessionToken;
    if (sessionToken == null) return;
    await _run(() async {
      final trip = await _api.complete(_token, sessionToken);
      if (mounted) setState(() => _trip = trip);
    });
  }

  Future<void> _submitSettlement() async {
    final sessionToken = _provisionalSessionToken;
    if (sessionToken == null) return;
    final account = _settlementAccount.text.trim();
    if (account.isEmpty) {
      _notice('請填寫結算帳戶');
      return;
    }
    await _run(() async {
      final trip = await _api.submitSettlement(
        _token,
        sessionToken,
        settlementMethod: _settlementMethod,
        settlementAccount: account,
      );
      if (mounted) setState(() => _trip = trip);
    });
  }

  Future<void> _submitFormalReview() async {
    final sessionToken = _provisionalSessionToken;
    if (sessionToken == null) return;
    await _run(() async {
      await _api.submitFormalReview(_token, sessionToken);
      if (mounted) setState(() => _formalReviewSubmitted = true);
    });
  }

  Future<void> _acceptRegistered() async {
    final formalToken = DriverApiClient.instance.token;
    if (formalToken == null || !DriverApiClient.instance.isApproved) {
      _notice('請先使用已審核的正式司機帳戶登入');
      return;
    }
    await _run(() async {
      await _api.acceptRegistered(_token, formalToken);
      setState(() => _step = 3);
    });
  }

  Future<void> _run(Future<void> Function() action) async {
    setState(() => _busy = true);
    try {
      await action();
    } on OrderInviteApiException catch (error) {
      if (mounted) _notice(error.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  void _notice(String message) => ScaffoldMessenger.of(context)
      .showSnackBar(SnackBar(content: Text(message)));

  @override
  Widget build(BuildContext context) {
    if (_previewMode) {
      if (_error != null) return _ErrorState(message: _error!);
      if (_preview == null) return const _LoadingState();
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) markOrderInvitePreviewReady();
      });
      return ColoredBox(
        color: DriverColors.background,
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(
              maxWidth: DriverDimensions.maxContentWidth,
            ),
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(DriverSpacing.lg),
              child: _OrderPreview(data: _preview!),
            ),
          ),
        ),
      );
    }

    return Scaffold(
      backgroundColor: DriverColors.background,
      appBar: AppBar(
        backgroundColor: DriverColors.background,
        surfaceTintColor: Colors.transparent,
        title: const Text('訂單邀請'),
        centerTitle: true,
      ),
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(
                maxWidth: DriverDimensions.maxContentWidth),
            child: _error != null
                ? _ErrorState(message: _error!)
                : _preview == null
                    ? const _LoadingState()
                    : SingleChildScrollView(
                        padding: const EdgeInsets.fromLTRB(
                          DriverSpacing.lg,
                          DriverSpacing.sm,
                          DriverSpacing.lg,
                          DriverSpacing.xl,
                        ),
                        child: _step == 3
                            ? _successContent()
                            : Column(
                                crossAxisAlignment: CrossAxisAlignment.stretch,
                                children: [
                                  const _InviteHeader(),
                                  const SizedBox(height: DriverSpacing.lg),
                                  _InviteProgress(step: _step),
                                  const SizedBox(height: DriverSpacing.lg),
                                  _OrderPreview(data: _preview!),
                                  const SizedBox(height: DriverSpacing.lg),
                                  if (_step == 0) ...[
                                    FilledButton.icon(
                                      onPressed: _busy
                                          ? null
                                          : () => setState(() => _step = 1),
                                      icon: const Icon(
                                          Icons.check_circle_outline),
                                      label: const Text('接受邀請'),
                                    ),
                                    const SizedBox(height: DriverSpacing.xs),
                                    TextButton(
                                      onPressed: _busy
                                          ? null
                                          : () => setState(
                                              () => _error = '已拒絕此訂單邀請'),
                                      child: const Text('拒絕'),
                                    ),
                                  ] else if (_step == 1) ...[
                                    _phoneVerification(),
                                    const SizedBox(height: DriverSpacing.xl),
                                    const _OrDivider(),
                                    const SizedBox(height: DriverSpacing.xl),
                                    OutlinedButton.icon(
                                      onPressed:
                                          _busy ? null : _acceptRegistered,
                                      icon: const Icon(Icons.badge_outlined),
                                      label: const Text('使用已登入正式司機身份接受'),
                                    ),
                                  ] else ...[
                                    _SectionHeading(
                                      title: '司機及車輛資料',
                                      description: '欄位順序與正式司機登記一致，請逐項核對。',
                                      trailing: OutlinedButton.icon(
                                        onPressed:
                                            _busy ? null : _pasteRecognition,
                                        icon: const Icon(Icons.content_paste,
                                            size: 18),
                                        label: const Text('文字識別'),
                                      ),
                                    ),
                                    const SizedBox(height: DriverSpacing.md),
                                    _registrationForm(),
                                    const SizedBox(height: DriverSpacing.lg),
                                    FilledButton.icon(
                                      onPressed: _busy ? null : _submit,
                                      icon: _busy
                                          ? const SizedBox.square(
                                              dimension: 18,
                                              child: CircularProgressIndicator(
                                                  strokeWidth: 2),
                                            )
                                          : const Icon(Icons.send_outlined),
                                      label: const Text('提交資料並接受訂單'),
                                    ),
                                  ],
                                ],
                              ),
                      ),
          ),
        ),
      ),
    );
  }

  String _formatDeparture(dynamic value) {
    final parsed = DateTime.tryParse(value?.toString() ?? '')?.toLocal();
    if (parsed == null) return '未提供';
    String two(int number) => number.toString().padLeft(2, '0');
    return '${parsed.year}-${two(parsed.month)}-${two(parsed.day)} ${two(parsed.hour)}:${two(parsed.minute)}';
  }

  String _formatPayout(Map<String, dynamic> trip) {
    final amount = trip['price'];
    final currency = trip['currency']?.toString() ?? '';
    if (amount == null) return '待確認';
    return '$currency $amount'.trim();
  }

  Widget _successContent() {
    final trip = _trip;
    if (_provisionalSessionToken == null || trip == null) {
      return const _SuccessCard();
    }
    final arrived = trip['arrivedAt'] != null;
    final started = trip['startedAt'] != null;
    final completed =
        trip['completedAt'] != null || trip['status'] == 'COMPLETED';
    final settled = trip['settlement'] != null;
    final cancelled = trip['status'] == 'CANCELLED';
    final canCancel = trip['canCancel'] == true && !started && !completed;
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      const _InviteHeader(compact: true),
      const SizedBox(height: DriverSpacing.lg),
      const _SuccessCard(),
      const SizedBox(height: DriverSpacing.lg),
      _InviteCard(children: [
        const _SectionHeading(
          title: '本次行程',
          description: '依序完成以下行程狀態，操作只適用於本次訂單。',
        ),
        const SizedBox(height: DriverSpacing.lg),
        _RoutePoint(
          icon: Icons.radio_button_checked,
          label: '上車地點',
          value: trip['pickupAddress']?.toString() ?? '',
          color: DriverColors.primary,
        ),
        const SizedBox(height: DriverSpacing.lg),
        _RoutePoint(
          icon: Icons.location_on,
          label: '目的地',
          value: trip['dropoffAddress']?.toString() ?? '',
          color: DriverColors.text,
        ),
        const SizedBox(height: DriverSpacing.lg),
        _OrderFact(label: '出發時間', value: _formatDeparture(trip['scheduledAt'])),
        _OrderFact(
            label: '乘客',
            value:
                '${trip['passengerName'] ?? '未提供'}（${trip['passengerGender'] ?? '未提供'}）'),
        _OrderFact(
          label: '乘客電話',
          value: [trip['passengerPhoneCountryCode'], trip['passengerPhone']]
              .where((value) => value != null && value.toString().isNotEmpty)
              .join(' '),
        ),
        if (trip['passengerPhoneVisible'] != true)
          const Padding(
            padding: EdgeInsets.only(bottom: DriverSpacing.sm),
            child: Text('出發前一小時才會顯示完整電話',
                style: TextStyle(color: DriverColors.secondaryText)),
          ),
        _OrderFact(label: '司機收入', value: _formatPayout(trip)),
        const SizedBox(height: DriverSpacing.md),
        _TripProgress(arrived: arrived, started: started, completed: completed),
        const SizedBox(height: DriverSpacing.lg),
        if (cancelled)
          const _InlineStatus(icon: Icons.cancel_outlined, text: '訂單已取消')
        else if (!arrived) ...[
          FilledButton.icon(
              onPressed: _busy ? null : () => _runTripAction(_api.arrive),
              icon: const Icon(Icons.near_me_outlined),
              label: const Text('已到達上車地點')),
          if (canCancel) ...[
            const SizedBox(height: DriverSpacing.sm),
            OutlinedButton.icon(
                onPressed: _busy ? null : _cancelTrip,
                icon: const Icon(Icons.cancel_outlined),
                label: const Text('取消訂單')),
          ],
        ] else if (!started) ...[
          FilledButton.icon(
              onPressed: _busy ? null : () => _runTripAction(_api.start),
              icon: const Icon(Icons.play_arrow),
              label: const Text('開始行程')),
          if (canCancel) ...[
            const SizedBox(height: DriverSpacing.sm),
            OutlinedButton.icon(
                onPressed: _busy ? null : _cancelTrip,
                icon: const Icon(Icons.cancel_outlined),
                label: const Text('取消訂單')),
          ],
        ] else if (!completed) ...[
          FilledButton.icon(
              onPressed: _busy ? null : _completeTrip,
              icon: const Icon(Icons.flag_outlined),
              label: const Text('完成行程')),
        ] else if (!settled) ...[
          const _InlineStatus(icon: Icons.check_circle_outline, text: '訂單已完成'),
          const SizedBox(height: DriverSpacing.lg),
          const _SectionHeading(
            title: '結算方式',
            description: '行程已完成，請填寫本次收款資料。',
          ),
          const SizedBox(height: DriverSpacing.md),
          _dropdown('結算方式', _settlementMethod, const ['微信支付'],
              (value) => setState(() => _settlementMethod = value)),
          const SizedBox(height: DriverSpacing.md),
          _InviteTextField(
            label: '微信 ID',
            controller: _settlementAccount,
            hint: '請填寫微信 ID',
            readOnly: false,
          ),
          const SizedBox(height: DriverSpacing.lg),
          FilledButton.icon(
              onPressed: _busy ? null : _submitSettlement,
              icon: const Icon(Icons.account_balance_wallet_outlined),
              label: const Text('提交結算方式')),
        ] else
          const _InlineStatus(icon: Icons.check_circle_outline, text: '訂單已完成'),
      ]),
      if (completed) ...[
        const SizedBox(height: DriverSpacing.lg),
        _InviteCard(children: [
          const _SectionHeading(
            title: '正式司機審核',
            description: '訂單完成後，可提交正式司機資格審核。',
          ),
          const SizedBox(height: DriverSpacing.lg),
          if (!_formalReviewSubmitted)
            FilledButton.icon(
                onPressed: _busy ? null : _submitFormalReview,
                icon: const Icon(Icons.assignment_turned_in_outlined),
                label: const Text('提交正式司機審核'))
          else
            const _InlineStatus(icon: Icons.schedule, text: '正式司機審核已提交'),
        ]),
      ],
    ]);
  }

  Widget _phoneVerification() => _InviteCard(
        padding: const EdgeInsets.all(DriverSpacing.xl),
        children: [
          const _SectionHeading(
            title: '手機驗證',
            description: '驗證手機後，可登記臨時司機資料或使用正式司機身份接受。',
          ),
          const SizedBox(height: DriverSpacing.xl),
          _InvitePhoneField(
            label: '聯繫電話',
            countryCode: _countryCode,
            controller: _phone,
            onCountryCodeChanged: (value) =>
                setState(() => _countryCode = value),
          ),
          const SizedBox(height: DriverSpacing.xl),
          _InviteVerificationCodeField(
            controller: _code,
            busy: _busy,
            onRequestCode: _requestCode,
          ),
          const SizedBox(height: DriverSpacing.xl),
          FilledButton(
            onPressed: _busy ? null : _verifyCode,
            child: const Text('驗證並繼續'),
          ),
        ],
      );

  void _changeOwnership(String value) {
    setState(() {
      _ownership = value;
      if (_ownership == '中國內地') _plateType = '兩地牌';
      _mainlandPlate.text = mainlandPlateInput(_mainlandPlate.text, value);
    });
  }

  List<String> _plateLabels() => orderInvitePlateLabels(_ownership, _plateType);

  Widget _plateField(String label) {
    final isMainland = label.contains('內地');
    final isMacau = label.contains('澳門');
    return _field(
      label,
      isMainland
          ? _mainlandPlate
          : isMacau
              ? _macauPlate
              : _hkPlate,
      hint: label == '澳門車牌（選填）' ? '如有澳門車牌請填寫' : '請輸入$label號碼',
      prefixText: isMainland ? (_ownership == '中國內地' ? '粵' : '粵Z·') : null,
      suffixText: isMainland
          ? _ownership == '香港'
              ? '港'
              : _ownership == '澳門'
                  ? '澳'
                  : null
          : null,
      inputFormatters: [
        vehiclePlateFormatter(label.contains('香港')
            ? '香港'
            : isMacau
                ? '澳門'
                : '內地'),
      ],
    );
  }

  Widget _registrationForm() {
    final plateOptions =
        _ownership == '中國內地' ? const ['兩地牌'] : const ['單牌', '兩地牌', '三地牌'];
    return _InviteCard(
        padding: const EdgeInsets.all(DriverSpacing.xl),
        children: [
          _field('姓名', _name, hint: '請輸入姓名'),
          _gap(),
          _InvitePhoneField(
            label: '香港／澳門號碼',
            countryCode: _hkMacauCountryCode,
            controller: _hkMacauPhone,
            countryCodes: const ['+852', '+853'],
            readOnly: _countryCode != '+86',
            onCountryCodeChanged: (value) =>
                setState(() => _hkMacauCountryCode = value),
          ),
          _gap(),
          _InvitePhoneField(
            label: '中國內地號碼',
            countryCode: '+86',
            controller: _mainlandPhone,
            countryCodes: const ['+86'],
            readOnly: _countryCode == '+86',
            onCountryCodeChanged: (_) {},
          ),
          _gap(),
          _dropdown('車輛歸屬地', _ownership, const ['香港', '澳門', '中國內地'],
              _changeOwnership),
          _gap(),
          _dropdown('車牌類型', _plateType, plateOptions,
              (value) => setState(() => _plateType = value)),
          for (final label in _plateLabels()) ...[
            _gap(),
            _plateField(label),
          ],
          _gap(),
          _dropdown('車輛類別', _vehicleCategory.text, _categories,
              (value) => setState(() => _vehicleCategory.text = value),
              hint: '請選擇車輛類別'),
          _gap(),
          _field('車輛顏色', _vehicleColor, hint: '例如：白色'),
          _gap(),
          _InviteVehiclePhotoField(
            filename: _photoName,
            byteLength: _photoBytes?.length,
            onTap: _pickPhoto,
          ),
        ]);
  }

  Widget _field(
    String label,
    TextEditingController controller, {
    String? hint,
    bool readOnly = false,
    TextInputType? keyboardType,
    String? prefixText,
    String? suffixText,
    List<TextInputFormatter>? inputFormatters,
  }) =>
      _InviteTextField(
        label: label,
        hint: hint ?? '請輸入$label',
        controller: controller,
        readOnly: readOnly,
        keyboardType: keyboardType,
        prefixText: prefixText,
        suffixText: suffixText,
        inputFormatters: inputFormatters,
      );

  Widget _dropdown(
    String label,
    String value,
    List<String> options,
    ValueChanged<String> changed, {
    String? hint,
  }) =>
      _InviteSelectField(
        label: label,
        value: options.contains(value) ? value : '',
        hint: hint ?? '請選擇$label',
        options: options,
        onChanged: changed,
      );

  Widget _gap() => const SizedBox(height: DriverSpacing.xl);

  @override
  void dispose() {
    for (final controller in [
      _name,
      _phone,
      _code,
      _hkMacauPhone,
      _mainlandPhone,
      _hkPlate,
      _macauPlate,
      _mainlandPlate,
      _vehicleCategory,
      _vehicleColor,
      _settlementAccount
    ]) {
      controller.dispose();
    }
    super.dispose();
  }
}

class _OrderFact extends StatelessWidget {
  const _OrderFact({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(bottom: DriverSpacing.sm),
        child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          SizedBox(
            width: 88,
            child: Text(label,
                style: const TextStyle(color: DriverColors.secondaryText)),
          ),
          Expanded(
            child: Text(value.isEmpty ? '未提供' : value,
                style: const TextStyle(
                    color: DriverColors.text, fontWeight: FontWeight.w600)),
          ),
        ]),
      );
}

class _InviteCard extends StatelessWidget {
  const _InviteCard({required this.children, this.padding});
  final List<Widget> children;
  final EdgeInsetsGeometry? padding;
  @override
  Widget build(BuildContext context) => Container(
        padding: padding ?? const EdgeInsets.all(DriverSpacing.lg),
        decoration: BoxDecoration(
          color: DriverColors.surface,
          border: Border.all(color: DriverColors.border),
          borderRadius: BorderRadius.circular(DriverRadii.card),
          boxShadow: DriverShadows.card,
        ),
        child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch, children: children),
      );
}

class _InviteTextField extends StatelessWidget {
  const _InviteTextField({
    required this.label,
    required this.hint,
    required this.controller,
    required this.readOnly,
    this.keyboardType,
    this.prefixText,
    this.suffixText,
    this.inputFormatters,
  });

  final String label;
  final String hint;
  final TextEditingController controller;
  final bool readOnly;
  final TextInputType? keyboardType;
  final String? prefixText;
  final String? suffixText;
  final List<TextInputFormatter>? inputFormatters;

  @override
  Widget build(BuildContext context) => Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(label,
              style: const TextStyle(
                  fontSize: DriverTypography.body,
                  fontWeight: FontWeight.w500,
                  color: DriverColors.text)),
          const SizedBox(height: DriverSpacing.sm),
          SizedBox(
            height: 50,
            child: TextField(
              controller: controller,
              readOnly: readOnly,
              keyboardType: keyboardType,
              inputFormatters: inputFormatters,
              decoration: _inviteRegistrationInputDecoration(
                hintText: hint,
                prefixText: prefixText,
                suffixText: suffixText,
              ),
              style: const TextStyle(fontSize: 15, color: DriverColors.text),
            ),
          ),
        ],
      );
}

class _InviteSelectField extends StatelessWidget {
  const _InviteSelectField({
    required this.label,
    required this.value,
    required this.hint,
    required this.options,
    required this.onChanged,
  });

  final String label;
  final String value;
  final String hint;
  final List<String> options;
  final ValueChanged<String> onChanged;

  Future<void> _select(BuildContext context) async {
    final selected = await showDialog<String>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: Text(label),
        contentPadding: const EdgeInsets.symmetric(vertical: DriverSpacing.sm),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            for (final option in options)
              ListTile(
                title: Text(option),
                trailing: option == value
                    ? const Icon(Icons.check, color: DriverColors.primary)
                    : null,
                onTap: () => Navigator.pop(dialogContext, option),
              ),
          ],
        ),
      ),
    );
    if (selected != null) onChanged(selected);
  }

  @override
  Widget build(BuildContext context) => Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(label,
              style: const TextStyle(
                  fontSize: DriverTypography.body,
                  fontWeight: FontWeight.w500,
                  color: DriverColors.text)),
          const SizedBox(height: DriverSpacing.sm),
          Semantics(
            button: true,
            label: value.isEmpty ? hint : value,
            child: InkWell(
              onTap: options.isEmpty ? null : () => _select(context),
              borderRadius: BorderRadius.circular(DriverRadii.input),
              child: Container(
                height: 50,
                padding:
                    const EdgeInsets.symmetric(horizontal: DriverSpacing.lg),
                decoration: _inviteRegistrationFieldDecoration(),
                child: Row(children: [
                  Expanded(
                    child: Text(
                      value.isEmpty ? hint : value,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontSize: 15,
                        color: value.isEmpty
                            ? DriverColors.secondaryText
                            : DriverColors.text,
                      ),
                    ),
                  ),
                  const Icon(Icons.arrow_drop_down,
                      size: 20, color: DriverColors.secondaryText),
                ]),
              ),
            ),
          ),
        ],
      );
}

class _InviteVehiclePhotoField extends StatelessWidget {
  const _InviteVehiclePhotoField({
    required this.filename,
    required this.byteLength,
    required this.onTap,
  });

  final String? filename;
  final int? byteLength;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text('車輛相片',
              style: TextStyle(
                  fontSize: DriverTypography.body,
                  fontWeight: FontWeight.w500,
                  color: DriverColors.text)),
          const SizedBox(height: DriverSpacing.md),
          OutlinedButton.icon(
            onPressed: onTap,
            icon: const Icon(Icons.camera_alt_outlined),
            label: Text(filename == null ? '上傳車輛相片' : '已選擇 $filename',
                maxLines: 1, overflow: TextOverflow.ellipsis),
            style: OutlinedButton.styleFrom(
              minimumSize: const Size.fromHeight(50),
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(DriverRadii.input)),
            ),
          ),
          if (byteLength != null) ...[
            const SizedBox(height: DriverSpacing.xs),
            Text('${(byteLength! / 1024 / 1024).toStringAsFixed(2)} MB・點擊更換',
                textAlign: TextAlign.center,
                style: const TextStyle(
                    fontSize: DriverTypography.caption,
                    color: DriverColors.secondaryText)),
          ],
        ],
      );
}

InputDecoration _inviteRegistrationInputDecoration({
  required String hintText,
  String? prefixText,
  String? suffixText,
}) =>
    InputDecoration(
      hintText: hintText,
      prefixText: prefixText,
      suffixText: suffixText,
      hintStyle:
          const TextStyle(fontSize: 15, color: DriverColors.secondaryText),
      contentPadding: const EdgeInsets.symmetric(
          horizontal: DriverSpacing.lg, vertical: 14),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(DriverRadii.input),
        borderSide: const BorderSide(color: DriverColors.border),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(DriverRadii.input),
        borderSide: const BorderSide(color: DriverColors.border),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(DriverRadii.input),
        borderSide: const BorderSide(color: DriverColors.primary),
      ),
    );

BoxDecoration _inviteRegistrationFieldDecoration() => BoxDecoration(
      color: DriverColors.surface,
      border: Border.all(color: DriverColors.border),
      borderRadius: BorderRadius.circular(DriverRadii.input),
    );

class _InvitePhoneField extends StatelessWidget {
  const _InvitePhoneField({
    required this.label,
    required this.countryCode,
    required this.controller,
    required this.onCountryCodeChanged,
    this.countryCodes = const ['+852', '+853', '+86'],
    this.readOnly = false,
  });

  final String label;
  final String countryCode;
  final TextEditingController controller;
  final ValueChanged<String> onCountryCodeChanged;
  final List<String> countryCodes;
  final bool readOnly;

  String _region(String code) => switch (code) {
        '+852' => '香港',
        '+853' => '澳門',
        '+86' => '內地',
        _ => '',
      };

  Future<void> _selectCode(BuildContext context) async {
    if (readOnly || countryCodes.length == 1) return;
    final selected = await showDialog<String>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('選擇區號'),
        contentPadding: const EdgeInsets.symmetric(vertical: DriverSpacing.sm),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            for (final code in countryCodes)
              ListTile(
                title: Text('${_region(code)} $code'),
                trailing: code == countryCode
                    ? const Icon(Icons.check, color: DriverColors.primary)
                    : null,
                onTap: () => Navigator.pop(dialogContext, code),
              ),
          ],
        ),
      ),
    );
    if (selected != null) onCountryCodeChanged(selected);
  }

  @override
  Widget build(BuildContext context) => Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(label,
              style: const TextStyle(
                  color: DriverColors.text,
                  fontSize: DriverTypography.body,
                  fontWeight: FontWeight.w500)),
          const SizedBox(height: DriverSpacing.sm),
          Row(children: [
            SizedBox(
              width: countryCodes.length == 1 ? 72 : 104,
              height: 50,
              child: Material(
                color: Colors.transparent,
                child: InkWell(
                  onTap: readOnly ? null : () => _selectCode(context),
                  borderRadius: BorderRadius.circular(DriverRadii.input),
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: DriverSpacing.sm),
                    decoration: BoxDecoration(
                      color: readOnly
                          ? DriverColors.background
                          : DriverColors.surface,
                      border: Border.all(color: DriverColors.border),
                      borderRadius: BorderRadius.circular(DriverRadii.input),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Flexible(
                          child: Text(
                            countryCodes.length == 1
                                ? countryCode
                                : '${_region(countryCode)} $countryCode',
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                                color: DriverColors.text,
                                fontSize: DriverTypography.label,
                                fontWeight: FontWeight.w500),
                          ),
                        ),
                        if (countryCodes.length > 1) ...[
                          const SizedBox(width: 2),
                          const Icon(Icons.arrow_drop_down,
                              size: 18, color: DriverColors.secondaryText),
                        ],
                      ],
                    ),
                  ),
                ),
              ),
            ),
            const SizedBox(width: DriverSpacing.sm),
            Expanded(
              child: SizedBox(
                height: 50,
                child: TextField(
                  controller: controller,
                  readOnly: readOnly,
                  keyboardType: TextInputType.phone,
                  inputFormatters: [
                    FilteringTextInputFormatter.digitsOnly,
                    LengthLimitingTextInputFormatter(
                        countryCode == '+86' ? 11 : 8),
                  ],
                  decoration: _inviteRegistrationInputDecoration(
                    hintText: countryCode == '+86' ? '11位電話號碼' : '8位電話號碼',
                  ).copyWith(
                    filled: readOnly,
                    fillColor: DriverColors.background,
                  ),
                ),
              ),
            ),
          ]),
        ],
      );
}

class _InviteVerificationCodeField extends StatelessWidget {
  const _InviteVerificationCodeField({
    required this.controller,
    required this.busy,
    required this.onRequestCode,
  });

  final TextEditingController controller;
  final bool busy;
  final VoidCallback onRequestCode;

  @override
  Widget build(BuildContext context) => Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text('驗證碼',
              style: TextStyle(
                  color: DriverColors.text,
                  fontSize: DriverTypography.body,
                  fontWeight: FontWeight.w500)),
          const SizedBox(height: DriverSpacing.sm),
          Row(children: [
            Expanded(
              child: SizedBox(
                height: 54,
                child: TextField(
                  controller: controller,
                  keyboardType: TextInputType.number,
                  inputFormatters: [
                    FilteringTextInputFormatter.digitsOnly,
                    LengthLimitingTextInputFormatter(5),
                  ],
                  decoration: InputDecoration(
                    hintText: '請輸入 5 位驗證碼',
                    contentPadding: const EdgeInsets.symmetric(
                        horizontal: DriverSpacing.lg),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(DriverRadii.input),
                    ),
                  ),
                ),
              ),
            ),
            const SizedBox(width: DriverSpacing.sm),
            SizedBox(
              height: 54,
              child: OutlinedButton(
                onPressed: busy ? null : onRequestCode,
                child: const Text('獲取驗證碼'),
              ),
            ),
          ]),
        ],
      );
}

class _OrDivider extends StatelessWidget {
  const _OrDivider();

  @override
  Widget build(BuildContext context) => const Row(children: [
        Expanded(child: Divider()),
        Padding(
          padding: EdgeInsets.symmetric(horizontal: DriverSpacing.md),
          child: Text('或', style: TextStyle(color: DriverColors.secondaryText)),
        ),
        Expanded(child: Divider()),
      ]);
}

class _InviteHeader extends StatelessWidget {
  const _InviteHeader({this.compact = false});
  final bool compact;

  @override
  Widget build(BuildContext context) => Container(
        padding: EdgeInsets.all(compact ? DriverSpacing.lg : DriverSpacing.xl),
        decoration: BoxDecoration(
          color: DriverColors.primaryDark,
          borderRadius: BorderRadius.circular(DriverRadii.card),
        ),
        child: Row(children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: DriverColors.onPrimary.withValues(alpha: 0.14),
              borderRadius: BorderRadius.circular(DriverRadii.input),
            ),
            child: const Icon(Icons.local_taxi_outlined,
                color: DriverColors.onPrimary),
          ),
          const SizedBox(width: DriverSpacing.md),
          const Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Driver Web',
                    style: TextStyle(
                        color: DriverColors.onPrimary,
                        fontSize: 20,
                        fontWeight: FontWeight.w700)),
                SizedBox(height: DriverSpacing.xs),
                Text('專屬訂單邀請', style: TextStyle(color: Color(0xffdbe6ff))),
              ],
            ),
          ),
          const _StatusPill(text: '安全邀請'),
        ]),
      );
}

class _InviteProgress extends StatelessWidget {
  const _InviteProgress({required this.step});
  final int step;

  @override
  Widget build(BuildContext context) {
    const labels = ['確認訂單', '手機驗證', '資料登記'];
    return Semantics(
      label: '邀請進度，第 ${step + 1} 步，共 3 步',
      child: Row(
        children: List.generate(labels.length, (index) {
          final active = index <= step;
          return Expanded(
            child: Row(children: [
              if (index > 0)
                Expanded(
                    child: Container(
                        height: 2,
                        color: active
                            ? DriverColors.primary
                            : DriverColors.border)),
              Column(children: [
                Container(
                  width: 30,
                  height: 30,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    color: active ? DriverColors.primary : DriverColors.surface,
                    shape: BoxShape.circle,
                    border: Border.all(
                        color: active
                            ? DriverColors.primary
                            : DriverColors.border),
                  ),
                  child: Text('${index + 1}',
                      style: TextStyle(
                          color: active
                              ? DriverColors.onPrimary
                              : DriverColors.secondaryText,
                          fontWeight: FontWeight.w700)),
                ),
                const SizedBox(height: DriverSpacing.xs),
                Text(labels[index],
                    style: TextStyle(
                        color:
                            active ? DriverColors.text : DriverColors.mutedText,
                        fontSize: DriverTypography.caption,
                        fontWeight:
                            active ? FontWeight.w600 : FontWeight.w400)),
              ]),
              if (index < labels.length - 1)
                Expanded(
                    child: Container(
                        height: 2,
                        color: index < step
                            ? DriverColors.primary
                            : DriverColors.border)),
            ]),
          );
        }),
      ),
    );
  }
}

class _SectionHeading extends StatelessWidget {
  const _SectionHeading({required this.title, this.description, this.trailing});
  final String title;
  final String? description;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) => Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title,
                    style: const TextStyle(
                        color: DriverColors.text,
                        fontSize: 18,
                        fontWeight: FontWeight.w700)),
                if (description != null) ...[
                  const SizedBox(height: DriverSpacing.xs),
                  Text(description!,
                      style: const TextStyle(
                          color: DriverColors.secondaryText,
                          fontSize: DriverTypography.label,
                          height: 1.45)),
                ],
              ],
            ),
          ),
          if (trailing != null) ...[
            const SizedBox(width: DriverSpacing.sm),
            trailing!,
          ],
        ],
      );
}

class _StatusPill extends StatelessWidget {
  const _StatusPill({required this.text});
  final String text;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(
            horizontal: DriverSpacing.md, vertical: DriverSpacing.sm),
        decoration: BoxDecoration(
          color: DriverColors.onPrimary.withValues(alpha: 0.14),
          borderRadius: BorderRadius.circular(DriverRadii.pill),
        ),
        child: Text(text,
            style: const TextStyle(
                color: DriverColors.onPrimary,
                fontSize: DriverTypography.caption,
                fontWeight: FontWeight.w600)),
      );
}

class _OrderPreview extends StatelessWidget {
  const _OrderPreview({required this.data});
  final Map<String, dynamic> data;

  String _formatDateTime(dynamic value) {
    final parsed = DateTime.tryParse(value?.toString() ?? '');
    if (parsed == null) return value?.toString() ?? '待確認';
    final local = parsed.toLocal();
    String two(int value) => value.toString().padLeft(2, '0');
    return '${local.year}/${two(local.month)}/${two(local.day)} '
        '${two(local.hour)}:${two(local.minute)}';
  }

  String _formatPayout(Map<String, dynamic> trip) {
    final amount = trip['payoutAmount'];
    if (amount == null) return '待確認';
    final currency = trip['payoutCurrency']?.toString() ?? 'HKD';
    return '$currency $amount';
  }

  @override
  Widget build(BuildContext context) {
    final trip = Map<String, dynamic>.from(data['trip'] as Map);
    return _InviteCard(children: [
      const _SectionHeading(
        title: '訂單詳情',
        description: '接受前請確認路線、時間及車輛要求。',
      ),
      const SizedBox(height: DriverSpacing.lg),
      _RoutePoint(
        icon: Icons.radio_button_checked,
        label: '上車',
        value: trip['origin']?.toString() ?? '',
        color: DriverColors.primary,
        legacyText: '上車：${trip['origin']}',
      ),
      const SizedBox(height: DriverSpacing.lg),
      _RoutePoint(
        icon: Icons.location_on,
        label: '目的地',
        value: trip['destination']?.toString() ?? '',
        color: DriverColors.text,
        legacyText: '目的地：${trip['destination']}',
      ),
      const SizedBox(height: DriverSpacing.lg),
      const Divider(height: 1),
      const SizedBox(height: DriverSpacing.lg),
      Wrap(
        spacing: DriverSpacing.sm,
        runSpacing: DriverSpacing.sm,
        children: [
          _MetaChip(
              icon: Icons.schedule,
              label: '出發時間',
              value: _formatDateTime(trip['scheduledAt'])),
          if (trip['vehicleCategory'] != null)
            _MetaChip(
                icon: Icons.directions_car_outlined,
                label: '車輛類別',
                value: trip['vehicleCategory'].toString()),
          _MetaChip(
              icon: Icons.payments_outlined,
              label: '預計收入',
              value: _formatPayout(trip)),
        ],
      ),
    ]);
  }
}

class _RoutePoint extends StatelessWidget {
  const _RoutePoint({
    required this.icon,
    required this.label,
    required this.value,
    required this.color,
    this.legacyText,
  });
  final IconData icon;
  final String label;
  final String value;
  final Color color;
  final String? legacyText;

  @override
  Widget build(BuildContext context) => Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
              width: 28,
              child: Icon(icon, color: color, size: 20, semanticLabel: label)),
          const SizedBox(width: DriverSpacing.sm),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label,
                    style: const TextStyle(
                        color: DriverColors.secondaryText,
                        fontSize: DriverTypography.caption)),
                const SizedBox(height: DriverSpacing.xs),
                Text(legacyText ?? '$label：$value',
                    style: const TextStyle(
                        color: DriverColors.text,
                        fontSize: DriverTypography.bodyLarge,
                        fontWeight: FontWeight.w600,
                        height: 1.35)),
              ],
            ),
          ),
        ],
      );
}

class _MetaChip extends StatelessWidget {
  const _MetaChip(
      {required this.icon, required this.label, required this.value});
  final IconData icon;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) => Container(
        constraints: const BoxConstraints(minWidth: 150),
        padding: const EdgeInsets.all(DriverSpacing.md),
        decoration: BoxDecoration(
          color: DriverColors.background,
          borderRadius: BorderRadius.circular(DriverRadii.input),
        ),
        child: Row(mainAxisSize: MainAxisSize.min, children: [
          Icon(icon, size: 18, color: DriverColors.primary),
          const SizedBox(width: DriverSpacing.sm),
          Flexible(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label,
                    style: const TextStyle(
                        color: DriverColors.secondaryText,
                        fontSize: DriverTypography.caption)),
                Text(value,
                    style: const TextStyle(
                        color: DriverColors.text, fontWeight: FontWeight.w600)),
              ],
            ),
          ),
        ]),
      );
}

class _TripProgress extends StatelessWidget {
  const _TripProgress(
      {required this.arrived, required this.started, required this.completed});
  final bool arrived;
  final bool started;
  final bool completed;

  @override
  Widget build(BuildContext context) {
    final states = [arrived, started, completed];
    const labels = ['已到達', '行程中', '已完成'];
    return Row(
      children: List.generate(
          3,
          (index) => Expanded(
                child: Column(children: [
                  Icon(
                      states[index]
                          ? Icons.check_circle
                          : Icons.circle_outlined,
                      color: states[index]
                          ? DriverColors.primary
                          : DriverColors.mutedText,
                      size: 22),
                  const SizedBox(height: DriverSpacing.xs),
                  Text(labels[index],
                      style: TextStyle(
                          color: states[index]
                              ? DriverColors.text
                              : DriverColors.secondaryText,
                          fontSize: DriverTypography.caption,
                          fontWeight: states[index]
                              ? FontWeight.w600
                              : FontWeight.w400)),
                ]),
              )),
    );
  }
}

class _InlineStatus extends StatelessWidget {
  const _InlineStatus({required this.icon, required this.text});
  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(DriverSpacing.md),
        decoration: BoxDecoration(
          color: DriverColors.infoBackground,
          borderRadius: BorderRadius.circular(DriverRadii.input),
        ),
        child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
          Icon(icon, color: DriverColors.primary, size: 20),
          const SizedBox(width: DriverSpacing.sm),
          Flexible(
              child: Text(text,
                  style: const TextStyle(fontWeight: FontWeight.w600))),
        ]),
      );
}

class _LoadingState extends StatelessWidget {
  const _LoadingState();
  @override
  Widget build(BuildContext context) => Center(
        child: Semantics(
          label: '正在載入訂單邀請',
          child: const CircularProgressIndicator(),
        ),
      );
}

class _ErrorState extends StatelessWidget {
  const _ErrorState({required this.message});
  final String message;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.all(DriverSpacing.xl),
        child: Center(
          child: _InviteCard(children: [
            const Icon(Icons.link_off,
                color: DriverColors.secondaryText, size: 48),
            const SizedBox(height: DriverSpacing.md),
            Text(message,
                textAlign: TextAlign.center,
                style: const TextStyle(
                    color: DriverColors.text,
                    fontSize: DriverTypography.bodyLarge,
                    fontWeight: FontWeight.w600)),
          ]),
        ),
      );
}

class _SuccessCard extends StatelessWidget {
  const _SuccessCard();
  @override
  Widget build(BuildContext context) => const _InviteCard(children: [
        Icon(Icons.check_circle, color: DriverColors.success, size: 56),
        SizedBox(height: DriverSpacing.lg),
        Text('已成功接受訂單',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700)),
        SizedBox(height: DriverSpacing.md),
        Text('此臨時身份只適用於本次受邀訂單。行程完成後可提交正式司機審核。', textAlign: TextAlign.center),
      ]);
}
