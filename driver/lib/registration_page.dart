import 'dart:async';
import 'dart:typed_data';
import 'dart:html' as html;

import 'package:flutter/material.dart';

import 'app/route_names.dart';
import 'core/api/driver_api_client.dart';
import 'core/navigation/driver_navigation.dart';
import 'core/vehicle_plate_rules.dart';
import 'package:flutter/services.dart';
import 'package:flutter_svg/flutter_svg.dart';

import 'package:driver_web/core/tokens/driver_tokens.dart';

class RegistrationPage extends StatefulWidget {
  const RegistrationPage(
      {super.key,
      this.initialCountryCode,
      this.initialPhone,
      this.verificationChallengeId,
      this.verificationCode,
      this.revisionDriver});

  final String? initialCountryCode;
  final String? initialPhone;
  final String? verificationChallengeId;
  final String? verificationCode;
  final Map<String, dynamic>? revisionDriver;

  @override
  State<RegistrationPage> createState() => _RegistrationPageState();
}

class _RegistrationPageState extends State<RegistrationPage> {
  final _nameController = TextEditingController();
  final _hkPlateController = TextEditingController();
  final _macauPlateController = TextEditingController();
  final _mainlandPlateController = TextEditingController();
  final _phoneController = TextEditingController();
  final _vehicleCategoryController = TextEditingController();
  final _vehicleColorController = TextEditingController();
  final _verificationCodeController = TextEditingController();
  int _registrationStep = 1;
  bool _phoneVerified = false;
  String? _registrationChallengeId;
  String _countryCode = '+852';
  String _vehicleOwnership = '香港';
  String _plateType = '兩地牌';
  List<String> _vehicleCategoryOptions = const [];
  bool _loadingVehicleCategories = true;
  Uint8List? _vehiclePhotoBytes;
  String? _vehiclePhotoName;
  String? _vehiclePhotoMime;
  bool _processingVehiclePhoto = false;
  bool _loading = false;

  @override
  void initState() {
    super.initState();
    _countryCode = widget.initialCountryCode ?? '+852';
    _phoneController.text = widget.initialPhone ?? '';
    _verificationCodeController.text = widget.verificationCode ?? '';
    _registrationChallengeId = widget.verificationChallengeId;
    _phoneVerified = _registrationChallengeId != null &&
        _verificationCodeController.text.length == 5;
    if (widget.revisionDriver != null) {
      final driver = widget.revisionDriver!;
      _nameController.text = driver['name']?.toString() ?? '';
      _countryCode = driver['phoneCountryCode']?.toString() ?? '+852';
      _phoneController.text = driver['phone']?.toString() ?? '';
      _vehicleOwnership = driver['vehicleOwnership']?.toString() ?? '香港';
      _plateType = driver['plateType']?.toString() ?? '兩地牌';
      _hkPlateController.text = driver['hkPlate']?.toString() ?? '';
      _macauPlateController.text =
          formatMacauPlateInput(driver['macauPlate']?.toString() ?? '');
      _mainlandPlateController.text = mainlandPlateInput(
          driver['mainlandPlate']?.toString() ?? '', _vehicleOwnership);
      _vehicleCategoryController.text =
          driver['vehicleCategory']?.toString() ?? '';
      _vehicleColorController.text = driver['vehicleColor']?.toString() ?? '';
    }
    _registrationStep = widget.revisionDriver != null || _phoneVerified ? 2 : 1;
    _phoneController.addListener(_clearRegistrationChallenge);
    _loadVehicleCategories();
  }

  Future<void> _loadVehicleCategories() async {
    try {
      final result = await DriverApiClient.instance.listVehicleCatalog();
      final categories = result['categories'];
      if (!mounted) return;
      setState(() {
        _vehicleCategoryOptions = categories is List
            ? categories
                .whereType<Map>()
                .where((item) => item['enabled'] != false)
                .map((item) => item['name']?.toString().trim() ?? '')
                .where((name) => name.isNotEmpty)
                .toList()
            : const [];
        _loadingVehicleCategories = false;
      });
    } on DriverApiException catch (error) {
      if (!mounted) return;
      setState(() => _loadingVehicleCategories = false);
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(error.message)));
    }
  }

  Future<void> _selectVehicleCategory() async {
    if (_loadingVehicleCategories) return;
    if (_vehicleCategoryOptions.isEmpty) {
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('目前沒有可選的車輛類別')));
      return;
    }
    final value = await showModalBottomSheet<String>(
      context: context,
      builder: (context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: _vehicleCategoryOptions
              .map((category) => ListTile(
                    title: Text(category),
                    onTap: () => Navigator.pop(context, category),
                  ))
              .toList(),
        ),
      ),
    );
    if (value != null) {
      setState(() => _vehicleCategoryController.text = value);
    }
  }

  Future<Uint8List> _readBlob(html.Blob blob) {
    final completer = Completer<Uint8List>();
    final reader = html.FileReader();
    reader.onLoad.listen((_) {
      final result = reader.result;
      if (result is ByteBuffer) {
        completer.complete(result.asUint8List());
      } else if (result is Uint8List) {
        completer.complete(result);
      } else {
        completer.completeError(StateError('無法讀取圖片'));
      }
    });
    reader.onError.listen((_) => completer.completeError(StateError('無法讀取圖片')));
    reader.readAsArrayBuffer(blob);
    return completer.future;
  }

  Future<Uint8List> _compressVehiclePhoto(html.File file) async {
    const maxBytes = 2 * 1024 * 1024;
    final objectUrl = html.Url.createObjectUrl(file);
    try {
      final image = html.ImageElement(src: objectUrl);
      await image.onLoad.first;
      var width = image.naturalWidth;
      var height = image.naturalHeight;
      if (width <= 0 || height <= 0) throw StateError('無法解碼圖片');
      const maxDimension = 2048;
      if (width > maxDimension || height > maxDimension) {
        final ratio = maxDimension / (width > height ? width : height);
        width = (width * ratio).round();
        height = (height * ratio).round();
      }
      var quality = 0.88;
      for (var attempt = 0; attempt < 12; attempt++) {
        final canvas = html.CanvasElement(width: width, height: height);
        canvas.context2D
          ..fillStyle = '#FFFFFF'
          ..fillRect(0, 0, width, height)
          ..drawImageScaled(image, 0, 0, width, height);
        final blob = await canvas.toBlob('image/jpeg', quality);
        final bytes = await _readBlob(blob);
        if (bytes.length <= maxBytes) return bytes;
        if (quality > 0.52) {
          quality -= 0.09;
        } else {
          width = (width * 0.82).round();
          height = (height * 0.82).round();
          quality = 0.72;
        }
      }
      throw StateError('圖片壓縮後仍超過 2 MB，請選擇較小的圖片');
    } finally {
      html.Url.revokeObjectUrl(objectUrl);
    }
  }

  Future<void> _selectVehiclePhoto() async {
    if (_processingVehiclePhoto) return;
    final input = html.FileUploadInputElement()
      ..accept = 'image/jpeg,image/png,image/webp'
      ..multiple = false;
    input.style
      ..position = 'fixed'
      ..left = '0'
      ..top = '0'
      ..width = '1px'
      ..height = '1px'
      ..opacity = '0'
      ..zIndex = '2147483647';
    html.document.body?.append(input);
    try {
      final selectionChanged = input.onChange.first;
      input.click();
      await selectionChanged;
      final files = input.files;
      final file = files == null || files.isEmpty ? null : files.first;
      if (file == null) return;
      if (!const ['image/jpeg', 'image/png', 'image/webp']
          .contains(file.type)) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('只支援 JPEG、PNG 或 WebP 圖片')));
        }
        return;
      }
      setState(() => _processingVehiclePhoto = true);
      try {
        const maxBytes = 2 * 1024 * 1024;
        final bytes = file.size <= maxBytes
            ? await _readBlob(file)
            : await _compressVehiclePhoto(file);
        if (!mounted) return;
        setState(() {
          _vehiclePhotoBytes = bytes;
          _vehiclePhotoName =
              file.size <= maxBytes ? file.name : '${file.name}.jpg';
          _vehiclePhotoMime = file.size <= maxBytes ? file.type : 'image/jpeg';
        });
      } on Object catch (error) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(
              content: Text(error is StateError ? error.message : '圖片處理失敗')));
        }
      } finally {
        if (mounted) setState(() => _processingVehiclePhoto = false);
      }
    } finally {
      input.remove();
    }
  }

  void _clearRegistrationChallenge() {
    if (_registrationChallengeId != null || _phoneVerified) {
      setState(() {
        _registrationChallengeId = null;
        _phoneVerified = false;
        _registrationStep = 1;
      });
    }
  }

  @override
  void dispose() {
    _phoneController.removeListener(_clearRegistrationChallenge);
    for (final controller in [
      _nameController,
      _hkPlateController,
      _macauPlateController,
      _mainlandPlateController,
      _phoneController,
      _vehicleCategoryController,
      _vehicleColorController,
      _verificationCodeController
    ]) {
      controller.dispose();
    }
    super.dispose();
  }

  Future<void> _requestRegistrationCode() async {
    final phone = _phoneController.text.trim();
    final expectedLength = _countryCode == '+86' ? 11 : 8;
    if (!RegExp(r'^\d+$').hasMatch(phone) || phone.length != expectedLength) {
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text('請先輸入 $expectedLength 位手機號碼')));
      return;
    }
    try {
      final result = await DriverApiClient.instance.requestRegistrationCode(
          countryCode: _countryCode, phoneNumber: phone);
      if (mounted) {
        setState(
            () => _registrationChallengeId = result['challengeId'] as String?);
        ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('驗證碼已發送，開發環境驗證碼為 00000')));
      }
    } on DriverApiException catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(error.message)));
      }
    }
  }

  Future<void> _verifyRegistrationCode() async {
    final code = _verificationCodeController.text.trim();
    if (_registrationChallengeId == null || code.length != 5) {
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('請先取得並輸入 5 位驗證碼')));
      return;
    }
    setState(() => _loading = true);
    try {
      await DriverApiClient.instance.verifyRegistrationCode(
          challengeId: _registrationChallengeId!, code: code);
      if (!mounted) return;
      setState(() {
        _phoneVerified = true;
        _registrationStep = 2;
      });
    } on DriverApiException catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(error.message)));
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _submit() async {
    final phone = _phoneController.text.trim();
    final expectedLength = _countryCode == '+86' ? 11 : 8;
    final requiresHkPlate = _vehicleOwnership == '香港' ||
        _vehicleOwnership == '中國內地' ||
        _plateType == '三地牌';
    final requiresMacauPlate = _vehicleOwnership == '澳門';
    final requiresMainlandPlate = _plateType != '單牌';
    if (_nameController.text.trim().isEmpty ||
        (requiresHkPlate && _hkPlateController.text.trim().isEmpty) ||
        (requiresMacauPlate && _macauPlateController.text.trim().isEmpty) ||
        _vehicleCategoryController.text.trim().isEmpty ||
        _vehicleColorController.text.trim().isEmpty ||
        (widget.revisionDriver == null && _vehiclePhotoBytes == null) ||
        (requiresMainlandPlate &&
            _mainlandPlateController.text.trim().isEmpty)) {
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('請完成所有必填資料')));
      return;
    }
    final mainlandPlate =
        composeMainlandPlate(_mainlandPlateController.text, _vehicleOwnership);
    final plateError = vehiclePlateError(
      vehicleOwnership: _vehicleOwnership,
      hongKongPlate: _hkPlateController.text,
      macauPlate: _macauPlateController.text,
      mainlandPlate: mainlandPlate,
    );
    if (plateError != null) {
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(plateError)));
      return;
    }
    if (!RegExp(r'^\d+$').hasMatch(phone) || phone.length != expectedLength) {
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text('請輸入 $expectedLength 位手機號碼')));
      return;
    }
    if (widget.revisionDriver == null &&
        (!_phoneVerified ||
            _registrationChallengeId == null ||
            _verificationCodeController.text.trim().length != 5)) {
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('請先完成手機驗證')));
      return;
    }
    setState(() => _loading = true);
    try {
      if (widget.revisionDriver != null) {
        await DriverApiClient.instance.resubmitDriver(
          name: _nameController.text.trim(),
          plateType: _plateType,
          vehicleOwnership: _vehicleOwnership,
          hkPlate: normalizeHongKongPlate(_hkPlateController.text),
          macauPlate: normalizeMacauPlate(_macauPlateController.text),
          mainlandPlate: normalizeMainlandPlate(mainlandPlate),
          vehicleCategory: _vehicleCategoryController.text.trim(),
          vehicleColor: _vehicleColorController.text.trim(),
          vehiclePhotoBytes: _vehiclePhotoBytes,
          vehiclePhotoFilename: _vehiclePhotoName,
          vehiclePhotoMime: _vehiclePhotoMime,
        );
      } else {
        await DriverApiClient.instance.registerDriver(
          name: _nameController.text.trim(),
          plateType: _plateType,
          vehicleOwnership: _vehicleOwnership,
          hkPlate: normalizeHongKongPlate(_hkPlateController.text).isEmpty
              ? null
              : normalizeHongKongPlate(_hkPlateController.text),
          macauPlate: normalizeMacauPlate(_macauPlateController.text).isEmpty
              ? null
              : normalizeMacauPlate(_macauPlateController.text),
          mainlandPlate: normalizeMainlandPlate(mainlandPlate).isEmpty
              ? null
              : normalizeMainlandPlate(mainlandPlate),
          phoneCountryCode: _countryCode,
          phone: phone,
          verificationChallengeId: _registrationChallengeId!,
          verificationCode: _verificationCodeController.text.trim(),
          vehicleCategory: _vehicleCategoryController.text.trim(),
          vehicleColor: _vehicleColorController.text.trim(),
          vehiclePhotoBytes: _vehiclePhotoBytes!,
          vehiclePhotoFilename: _vehiclePhotoName!,
          vehiclePhotoMime: _vehiclePhotoMime!,
        );
      }
      if (mounted) {
        DriverNavigation.replace(context, DriverRouteNames.reviewStatus);
      }
    } on DriverApiException catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(error.message)));
      }
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
                padding: const EdgeInsets.fromLTRB(24, 24, 24, 24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    _RegistrationHeader(
                        onBack: () => Navigator.of(context).maybePop()),
                    const SizedBox(height: DriverSpacing.xl),
                    if (_registrationStep == 1)
                      _PhoneVerificationCard(
                        phoneController: _phoneController,
                        verificationController: _verificationCodeController,
                        countryCode: _countryCode,
                        onCountryCodeChanged: (value) {
                          _clearRegistrationChallenge();
                          setState(() => _countryCode = value);
                        },
                        onRequestCode: _requestRegistrationCode,
                      )
                    else
                      _RegistrationCard(
                        initialOwnership: _vehicleOwnership,
                        initialPlateType: _plateType,
                        nameController: _nameController,
                        hkPlateController: _hkPlateController,
                        macauPlateController: _macauPlateController,
                        mainlandPlateController: _mainlandPlateController,
                        vehicleCategoryController: _vehicleCategoryController,
                        vehicleCategoryLoading: _loadingVehicleCategories,
                        onVehicleCategoryTap: _selectVehicleCategory,
                        vehicleColorController: _vehicleColorController,
                        vehiclePhotoName: _vehiclePhotoName,
                        vehiclePhotoSize: _vehiclePhotoBytes?.length,
                        vehiclePhotoProcessing: _processingVehiclePhoto,
                        onVehiclePhotoTap: _selectVehiclePhoto,
                        onOwnershipChanged: (value) => setState(() {
                          _vehicleOwnership = value;
                          _hkPlateController.clear();
                          _macauPlateController.clear();
                          _mainlandPlateController.clear();
                        }),
                        onPlateTypeChanged: (value) =>
                            setState(() => _plateType = value),
                      ),
                    const SizedBox(height: DriverSpacing.xl),
                    SizedBox(
                      height: 56,
                      child: ElevatedButton(
                        onPressed: _loading
                            ? null
                            : (_registrationStep == 1
                                ? _verifyRegistrationCode
                                : _submit),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: DriverColors.success,
                          foregroundColor: DriverColors.labelText,
                          elevation: 8,
                          shadowColor: const Color(0x334cd964),
                          shape: RoundedRectangleBorder(
                              borderRadius:
                                  BorderRadius.circular(DriverRadii.card)),
                          padding: const EdgeInsets.symmetric(
                              horizontal: 24, vertical: 16),
                        ),
                        child: Text(
                          _registrationStep == 1 ? '驗證並繼續' : '提交審核',
                          style: const TextStyle(
                              fontSize: DriverTypography.bodyLarge,
                              fontWeight: FontWeight.w700),
                        ),
                      ),
                    ),
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

class _RegistrationHeader extends StatelessWidget {
  const _RegistrationHeader({required this.onBack});
  final VoidCallback onBack;

  @override
  Widget build(BuildContext context) => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            height: 56,
            child: Row(
              children: [
                IconButton(
                  onPressed: onBack,
                  tooltip: '返回登入',
                  padding: EdgeInsets.zero,
                  constraints:
                      const BoxConstraints(minWidth: 44, minHeight: 44),
                  icon: const Icon(Icons.chevron_left,
                      size: 24, color: DriverColors.text),
                ),
                const SizedBox(width: DriverSpacing.sm),
                const Text('司機註冊',
                    style: TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.w700,
                        color: DriverColors.text)),
              ],
            ),
          ),
          const SizedBox(height: DriverSpacing.sm),
          const Text('請完成以下資料以完成審核',
              style: TextStyle(
                  fontSize: DriverTypography.body,
                  color: DriverColors.secondaryText)),
        ],
      );
}

class _PhoneVerificationCard extends StatelessWidget {
  const _PhoneVerificationCard(
      {required this.phoneController,
      required this.verificationController,
      required this.countryCode,
      required this.onCountryCodeChanged,
      required this.onRequestCode});
  final TextEditingController phoneController, verificationController;
  final String countryCode;
  final ValueChanged<String> onCountryCodeChanged;
  final VoidCallback onRequestCode;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
            color: DriverColors.surface,
            border: Border.all(color: DriverColors.divider),
            borderRadius: BorderRadius.circular(DriverRadii.card)),
        child:
            Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          const Text('第一步：驗證手機號碼',
              style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                  color: DriverColors.text)),
          const SizedBox(height: DriverSpacing.lg),
          _PhoneSection(
              controller: phoneController,
              countryCode: countryCode,
              onCountryCodeChanged: onCountryCodeChanged),
          const SizedBox(height: DriverSpacing.md),
          _VerificationCodeSection(
              controller: verificationController, onRequestCode: onRequestCode),
        ]),
      );
}

class _RegistrationCard extends StatefulWidget {
  const _RegistrationCard(
      {required this.initialOwnership,
      required this.initialPlateType,
      required this.nameController,
      required this.hkPlateController,
      required this.macauPlateController,
      required this.mainlandPlateController,
      required this.vehicleCategoryController,
      required this.vehicleCategoryLoading,
      required this.onVehicleCategoryTap,
      required this.vehicleColorController,
      required this.vehiclePhotoName,
      required this.vehiclePhotoSize,
      required this.vehiclePhotoProcessing,
      required this.onVehiclePhotoTap,
      required this.onPlateTypeChanged,
      required this.onOwnershipChanged});
  final String initialOwnership;
  final String initialPlateType;
  final TextEditingController nameController,
      hkPlateController,
      macauPlateController,
      mainlandPlateController,
      vehicleCategoryController,
      vehicleColorController;
  final ValueChanged<String> onPlateTypeChanged;
  final ValueChanged<String> onOwnershipChanged;
  final bool vehicleCategoryLoading;
  final VoidCallback onVehicleCategoryTap;
  final String? vehiclePhotoName;
  final int? vehiclePhotoSize;
  final bool vehiclePhotoProcessing;
  final VoidCallback onVehiclePhotoTap;

  @override
  State<_RegistrationCard> createState() => _RegistrationCardState();
}

class _RegistrationCardState extends State<_RegistrationCard> {
  static const _regions = ['香港', '澳門', '中國內地'];
  static const _plateTypes = ['單牌', '兩地牌', '三地牌'];

  late int _regionIndex;
  late String _plateType;

  List<String> get _availablePlateTypes =>
      _regionIndex == 2 ? ['兩地牌'] : _plateTypes;

  @override
  void initState() {
    super.initState();
    final initialRegionIndex = _regions.indexOf(widget.initialOwnership);
    _regionIndex = initialRegionIndex < 0 ? 0 : initialRegionIndex;
    _plateType = _availablePlateTypes.contains(widget.initialPlateType)
        ? widget.initialPlateType
        : '兩地牌';
  }

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
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _TextFieldSection(
                label: '姓名',
                hint: '請輸入司機姓名',
                controller: widget.nameController),
            const SizedBox(height: DriverSpacing.lg),
            _ChoiceSection(
              label: '車輛歸屬地',
              options: _regions,
              selected: _regionIndex,
              onChanged: (index) {
                var plateTypeChanged = false;
                setState(() {
                  _regionIndex = index;
                  if (!_availablePlateTypes.contains(_plateType)) {
                    _plateType = '兩地牌';
                    plateTypeChanged = true;
                  }
                });
                widget.onOwnershipChanged(_regions[index]);
                if (plateTypeChanged) {
                  widget.onPlateTypeChanged(_plateType);
                }
              },
            ),
            const SizedBox(height: DriverSpacing.lg),
            _PlateSection(
              region: _regions[_regionIndex],
              plateType: _plateType,
              plateTypes: _availablePlateTypes,
              hkPlateController: widget.hkPlateController,
              macauPlateController: widget.macauPlateController,
              mainlandPlateController: widget.mainlandPlateController,
              onPlateTypeChanged: (index) {
                final value = _availablePlateTypes[index];
                setState(() => _plateType = value);
                widget.onPlateTypeChanged(value);
              },
            ),
            const SizedBox(height: DriverSpacing.lg),
            _SelectFieldSection(
              label: '車輛類別',
              hint: widget.vehicleCategoryLoading ? '載入中…' : '請選擇車輛類別',
              value: widget.vehicleCategoryController.text,
              onTap: widget.vehicleCategoryLoading
                  ? null
                  : widget.onVehicleCategoryTap,
            ),
            const SizedBox(height: DriverSpacing.lg),
            _TextFieldSection(
              label: '車輛顏色',
              hint: '例如：白色',
              controller: widget.vehicleColorController,
            ),
            const SizedBox(height: DriverSpacing.lg),
            _VehiclePhotoSection(
              filename: widget.vehiclePhotoName,
              byteLength: widget.vehiclePhotoSize,
              processing: widget.vehiclePhotoProcessing,
              onTap: widget.onVehiclePhotoTap,
            ),
          ],
        ),
      );
}

class _SelectFieldSection extends StatelessWidget {
  const _SelectFieldSection({
    required this.label,
    required this.hint,
    required this.value,
    required this.onTap,
  });

  final String label;
  final String hint;
  final String value;
  final VoidCallback? onTap;

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
              onTap: onTap,
              borderRadius: BorderRadius.circular(DriverRadii.input),
              child: Container(
                height: 50,
                padding: const EdgeInsets.symmetric(horizontal: 16),
                decoration: _registrationFieldDecoration(),
                child: Row(
                  children: [
                    Expanded(
                      child: Text(
                        value.isEmpty ? hint : value,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontSize: 15,
                          color: value.isEmpty
                              ? DriverColors.secondaryText
                              : DriverColors.text,
                        ),
                      ),
                    ),
                    const SizedBox(width: DriverSpacing.sm),
                    SvgPicture.asset('assets/chevron-down.svg',
                        width: 16, height: 16),
                  ],
                ),
              ),
            ),
          ),
        ],
      );
}

class _TextFieldSection extends StatelessWidget {
  const _TextFieldSection(
      {required this.label,
      required this.hint,
      this.controller,
      this.inputFormatters,
      this.prefixText,
      this.suffixText});
  final String label;
  final String hint;
  final TextEditingController? controller;
  final List<TextInputFormatter>? inputFormatters;
  final String? prefixText;
  final String? suffixText;

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
          Container(
            height: 50,
            decoration: _registrationFieldDecoration(),
            child: TextField(
              controller: controller,
              inputFormatters: inputFormatters,
              decoration: InputDecoration(
                hintText: hint,
                prefixText: prefixText,
                suffixText: suffixText,
                hintStyle: const TextStyle(
                    fontSize: 15, color: DriverColors.secondaryText),
                border: InputBorder.none,
                contentPadding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
              ),
              style: const TextStyle(fontSize: 15, color: DriverColors.text),
            ),
          ),
        ],
      );
}

class _ChoiceSection extends StatefulWidget {
  const _ChoiceSection({
    required this.label,
    required this.options,
    required this.selected,
    this.onChanged,
  });
  final String label;
  final List<String> options;
  final int selected;
  final ValueChanged<int>? onChanged;

  @override
  State<_ChoiceSection> createState() => _ChoiceSectionState();
}

class _ChoiceSectionState extends State<_ChoiceSection> {
  late int selected = widget.selected;

  @override
  void didUpdateWidget(covariant _ChoiceSection oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.selected != widget.selected) selected = widget.selected;
  }

  @override
  Widget build(BuildContext context) => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(widget.label,
              style: const TextStyle(
                  fontSize: DriverTypography.body,
                  fontWeight: FontWeight.w500,
                  color: DriverColors.text)),
          const SizedBox(height: DriverSpacing.md),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              for (var i = 0; i < widget.options.length; i++)
                GestureDetector(
                  onTap: () {
                    setState(() => selected = i);
                    widget.onChanged?.call(i);
                  },
                  child: _ChoiceChip(
                      label: widget.options[i], selected: i == selected),
                )
            ],
          ),
        ],
      );
}

class _ChoiceChip extends StatelessWidget {
  const _ChoiceChip({required this.label, required this.selected});
  final String label;
  final bool selected;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        decoration: BoxDecoration(
          color: selected ? DriverColors.activeBlue : const Color(0xfff5f7fa),
          border: Border.all(
              color: selected ? DriverColors.activeBlue : DriverColors.border),
          borderRadius: BorderRadius.circular(20),
        ),
        child: Text(label,
            style: TextStyle(
                fontSize: DriverTypography.body,
                fontWeight: selected ? FontWeight.w700 : FontWeight.w400,
                color:
                    selected ? DriverColors.surface : DriverColors.labelText)),
      );
}

class _PlateSection extends StatelessWidget {
  const _PlateSection({
    required this.region,
    required this.plateType,
    required this.plateTypes,
    required this.hkPlateController,
    required this.macauPlateController,
    required this.mainlandPlateController,
    required this.onPlateTypeChanged,
  });
  final String region;
  final String plateType;
  final List<String> plateTypes;
  final TextEditingController hkPlateController,
      macauPlateController,
      mainlandPlateController;
  final ValueChanged<int> onPlateTypeChanged;

  List<String> _plateLabels() {
    if (plateType == '三地牌') {
      return [
        '香港車牌',
        region == '香港' ? '澳門車牌（選填）' : '澳門車牌',
        '內地車牌',
      ];
    }
    if (plateType == '兩地牌') {
      if (region == '中國內地') return ['內地車牌', '香港車牌'];
      return ['$region車牌', '內地車牌'];
    }
    return [region == '中國內地' ? '內地車牌' : '$region車牌'];
  }

  @override
  Widget build(BuildContext context) {
    final fields = [
      for (final label in _plateLabels())
        _TextFieldSection(
          label: label,
          hint: label == '澳門車牌（選填）' ? '如有澳門車牌請填寫' : '請輸入$label號碼',
          controller: label.contains('澳門')
              ? macauPlateController
              : label.contains('內地')
                  ? mainlandPlateController
                  : hkPlateController,
          prefixText: label.contains('內地')
              ? region == '中國內地'
                  ? '粵'
                  : '粵Z·'
              : null,
          suffixText: label.contains('內地')
              ? region == '香港'
                  ? '港'
                  : region == '澳門'
                      ? '澳'
                      : null
              : null,
          inputFormatters: [
            vehiclePlateFormatter(label.contains('香港')
                ? '香港'
                : label.contains('澳門')
                    ? '澳門'
                    : '內地')
          ],
        ),
    ];
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _ChoiceSection(
          label: '車牌類型',
          options: plateTypes,
          selected: plateTypes.indexOf(plateType),
          onChanged: onPlateTypeChanged,
        ),
        const SizedBox(height: DriverSpacing.md),
        LayoutBuilder(
          builder: (context, constraints) => constraints.maxWidth < 340
              ? Column(
                  children: _withSpacing(
                      fields, const SizedBox(height: DriverSpacing.md)))
              : Row(
                  children: _withSpacing(
                  [for (final field in fields) Expanded(child: field)],
                  const SizedBox(width: DriverSpacing.md),
                )),
        ),
      ],
    );
  }

  List<Widget> _withSpacing(List<Widget> children, Widget spacing) => [
        for (var i = 0; i < children.length; i++) ...[
          if (i > 0) spacing,
          children[i],
        ],
      ];
}

class _PhoneSection extends StatelessWidget {
  const _PhoneSection(
      {required this.controller,
      required this.countryCode,
      required this.onCountryCodeChanged});
  final TextEditingController controller;
  final String countryCode;
  final ValueChanged<String> onCountryCodeChanged;

  @override
  Widget build(BuildContext context) {
    final isMainland = countryCode == '+86';
    final region = countryCode == '+853' ? '澳門' : '香港';
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const Text('聯繫電話',
            style: TextStyle(
                fontSize: DriverTypography.body,
                fontWeight: FontWeight.w500,
                color: DriverColors.text)),
        const SizedBox(height: DriverSpacing.md),
        _PhoneField(
          label: isMainland ? '中國內地號碼' : '香港/澳門號碼',
          prefix: countryCode,
          controller: controller,
          regionOptions: isMainland ? null : const {'香港': '+852', '澳門': '+853'},
          selectedRegion: isMainland ? null : region,
          onRegionChanged: (value) =>
              onCountryCodeChanged(value == '澳門' ? '+853' : '+852'),
        ),
      ],
    );
  }
}

class _VerificationCodeSection extends StatelessWidget {
  const _VerificationCodeSection({
    required this.controller,
    required this.onRequestCode,
  });

  final TextEditingController controller;
  final VoidCallback onRequestCode;

  @override
  Widget build(BuildContext context) => Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text('驗證碼',
              style: TextStyle(
                  fontSize: DriverTypography.body,
                  fontWeight: FontWeight.w500,
                  color: DriverColors.text)),
          const SizedBox(height: DriverSpacing.sm),
          Row(children: [
            Expanded(
              child: Container(
                height: 50,
                decoration: _registrationFieldDecoration(),
                child: TextField(
                  controller: controller,
                  keyboardType: TextInputType.number,
                  inputFormatters: [
                    FilteringTextInputFormatter.digitsOnly,
                    LengthLimitingTextInputFormatter(5),
                  ],
                  decoration: const InputDecoration(
                    hintText: '請輸入 5 位驗證碼',
                    hintStyle: TextStyle(
                        fontSize: 15, color: DriverColors.secondaryText),
                    border: InputBorder.none,
                    contentPadding:
                        EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                  ),
                  style:
                      const TextStyle(fontSize: 15, color: DriverColors.text),
                ),
              ),
            ),
            const SizedBox(width: DriverSpacing.sm),
            SizedBox(
              height: 50,
              child: OutlinedButton(
                onPressed: onRequestCode,
                style: OutlinedButton.styleFrom(
                  foregroundColor: DriverColors.activeBlue,
                  side: const BorderSide(color: DriverColors.activeBlue),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(DriverRadii.input),
                  ),
                ),
                child: const Text('獲取驗證碼'),
              ),
            ),
          ]),
        ],
      );
}

class _PhoneField extends StatelessWidget {
  const _PhoneField({
    required this.label,
    required this.prefix,
    required this.controller,
    this.regionOptions,
    this.selectedRegion,
    this.onRegionChanged,
  });
  final String label;
  final String prefix;
  final TextEditingController controller;
  final Map<String, String>? regionOptions;
  final String? selectedRegion;
  final ValueChanged<String>? onRegionChanged;

  void _showRegionPicker(BuildContext context) {
    showDialog<void>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('選擇區號'),
        contentPadding: const EdgeInsets.symmetric(vertical: 8),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            for (final entry in regionOptions!.entries)
              ListTile(
                title: Text('${entry.key} ${entry.value}'),
                trailing: entry.key == selectedRegion
                    ? const Icon(Icons.check, color: DriverColors.activeBlue)
                    : null,
                onTap: () {
                  onRegionChanged?.call(entry.key);
                  Navigator.of(dialogContext).pop();
                },
              ),
          ],
        ),
      ),
    );
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
          Row(children: [
            SizedBox(
              height: 50,
              width: regionOptions == null ? 72 : 104,
              child: regionOptions == null
                  ? Container(
                      alignment: Alignment.center,
                      decoration: _registrationFieldDecoration(),
                      child: Text(prefix,
                          style: const TextStyle(
                              fontSize: DriverTypography.body,
                              fontWeight: FontWeight.w500,
                              color: DriverColors.text)))
                  : Material(
                      color: Colors.transparent,
                      child: InkWell(
                        borderRadius: BorderRadius.circular(DriverRadii.input),
                        onTap: () => _showRegionPicker(context),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8),
                          decoration: _registrationFieldDecoration(),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Flexible(
                                child: Text(
                                  '$selectedRegion $prefix',
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(
                                      fontSize: DriverTypography.label,
                                      color: DriverColors.text),
                                ),
                              ),
                              const SizedBox(width: 2),
                              const Icon(Icons.arrow_drop_down,
                                  size: 18, color: DriverColors.secondaryText),
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
                  inputFormatters: [
                    FilteringTextInputFormatter.digitsOnly,
                    LengthLimitingTextInputFormatter(prefix == '+86' ? 11 : 8),
                  ],
                  decoration: _registrationInputDecoration(
                    hintText: prefix == '+86' ? '11位電話號碼' : '8位電話號碼',
                    contentPadding: const EdgeInsets.symmetric(
                        horizontal: 12, vertical: 14),
                  ),
                ),
              ),
            ),
          ]),
        ],
      );
}

class _VehiclePhotoSection extends StatelessWidget {
  const _VehiclePhotoSection(
      {required this.filename,
      required this.byteLength,
      required this.processing,
      required this.onTap});

  final String? filename;
  final int? byteLength;
  final bool processing;
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
          Semantics(
            button: true,
            label: filename == null ? '上傳車輛相片' : '更換車輛相片',
            child: InkWell(
              onTap: processing ? null : onTap,
              borderRadius: BorderRadius.circular(DriverRadii.input),
              child: Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 20, vertical: 20),
                decoration: BoxDecoration(
                    color: DriverColors.surface,
                    border: Border.all(
                        color: DriverColors.primary, style: BorderStyle.none),
                    borderRadius: BorderRadius.circular(DriverRadii.input)),
                child: CustomPaint(
                  painter: _DashedBorderPainter(
                      color: DriverColors.primary, radius: 12),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(vertical: 1),
                    child: Column(children: [
                      Container(
                          width: 40,
                          height: 40,
                          alignment: Alignment.center,
                          decoration: BoxDecoration(
                              color: DriverColors.infoBackground,
                              borderRadius: BorderRadius.circular(20)),
                          child: SvgPicture.asset('assets/camera.svg',
                              width: 20, height: 20)),
                      const SizedBox(height: DriverSpacing.md),
                      Text(
                          processing
                              ? '正在壓縮圖片…'
                              : filename == null
                                  ? '點擊上傳車輛相片'
                                  : '已選擇 $filename',
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                              fontSize: DriverTypography.label,
                              fontWeight: FontWeight.w500,
                              color: DriverColors.primary)),
                      const SizedBox(height: DriverSpacing.xs),
                      Text(
                          byteLength == null
                              ? '只允許 1 張 JPEG、PNG 或 WebP，相片上限 2 MB'
                              : '${(byteLength! / 1024 / 1024).toStringAsFixed(2)} MB・點擊更換',
                          style: const TextStyle(
                              fontSize: 11, color: DriverColors.secondaryText),
                          textAlign: TextAlign.center),
                    ]),
                  ),
                ),
              ),
            ),
          ),
        ],
      );
}

class _DashedBorderPainter extends CustomPainter {
  const _DashedBorderPainter({required this.color, required this.radius});
  final Color color;
  final double radius;
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1;
    final path = Path()
      ..addRRect(
          RRect.fromRectAndRadius(Offset.zero & size, Radius.circular(radius)));
    for (final metric in path.computeMetrics()) {
      for (var distance = 0.0; distance < metric.length; distance += 8) {
        canvas.drawPath(metric.extractPath(distance, distance + 5), paint);
      }
    }
  }

  @override
  bool shouldRepaint(covariant _DashedBorderPainter oldDelegate) => false;
}

InputDecoration _registrationInputDecoration({
  String? hintText,
  EdgeInsetsGeometry? contentPadding,
}) =>
    InputDecoration(
      hintText: hintText,
      hintStyle:
          const TextStyle(fontSize: 15, color: DriverColors.secondaryText),
      filled: true,
      fillColor: DriverColors.surface,
      contentPadding: contentPadding ??
          const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
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
        borderSide: const BorderSide(color: DriverColors.activeBlue),
      ),
    );

BoxDecoration _registrationFieldDecoration() => BoxDecoration(
    color: DriverColors.surface,
    border: Border.all(color: DriverColors.border),
    borderRadius: BorderRadius.circular(DriverRadii.input));
