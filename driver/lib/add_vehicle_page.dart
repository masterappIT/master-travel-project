import 'dart:async';
import 'dart:html' as html;
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_svg/flutter_svg.dart';

import 'core/api/driver_api_client.dart';
import 'core/vehicle_plate_rules.dart';
import 'core/layout/driver_page_shell.dart';
import 'core/tokens/driver_tokens.dart';

class VehicleFormData {
  const VehicleFormData({
    this.id,
    this.isPrimary = false,
    required this.ownership,
    required this.plateType,
    required this.category,
    required this.hongKongPlate,
    required this.macauPlate,
    required this.mainlandPlate,
    required this.color,
    this.hasPhoto = false,
  });

  factory VehicleFormData.fromJson(Map<String, dynamic> json) =>
      VehicleFormData(
        id: json['id']?.toString(),
        isPrimary: json['isPrimary'] == true,
        ownership: json['vehicleOwnership']?.toString() ?? '香港',
        plateType: json['plateType']?.toString() ?? '兩地牌',
        category: json['vehicleCategory']?.toString() ?? '',
        hongKongPlate: json['hkPlate']?.toString() ?? '',
        macauPlate: json['macauPlate']?.toString() ?? '',
        mainlandPlate: json['mainlandPlate']?.toString() ?? '',
        color: json['vehicleColor']?.toString() ?? '',
        hasPhoto: json['vehiclePhotos'] is List &&
            (json['vehiclePhotos'] as List).isNotEmpty,
      );

  final String? id;
  final bool isPrimary;
  final String ownership;
  final String plateType;
  final String category;
  final String hongKongPlate;
  final String macauPlate;
  final String mainlandPlate;
  final String color;
  final bool hasPhoto;
}

class AddVehiclePage extends StatefulWidget {
  const AddVehiclePage({super.key, this.initialData, DriverApiClient? api})
      : _api = api;

  final VehicleFormData? initialData;
  final DriverApiClient? _api;

  @override
  State<AddVehiclePage> createState() => _AddVehiclePageState();
}

class _AddVehiclePageState extends State<AddVehiclePage> {
  static const _ownershipOptions = ['香港', '澳門', '中國內地'];

  DriverApiClient get _api => widget._api ?? DriverApiClient.instance;
  static const _plateTypeOptions = ['單牌', '兩地牌', '三地牌'];

  String _ownership = '香港';
  String _plateType = '兩地牌';
  String? _category;
  final _hkPlate = TextEditingController();
  final _macauPlate = TextEditingController();
  final _mainlandPlate = TextEditingController();
  final _color = TextEditingController();

  List<String> _categoryOptions = const [];
  bool _isSaving = false;
  bool _isProcessingPhoto = false;
  Uint8List? _vehiclePhotoBytes;
  String? _vehiclePhotoName;
  String? _vehiclePhotoMime;

  @override
  void initState() {
    super.initState();
    final data = widget.initialData;
    if (data != null) {
      _ownership = data.ownership;
      _plateType = data.plateType;
      _category = data.category;
      _hkPlate.text = data.hongKongPlate;
      _macauPlate.text = formatMacauPlateInput(data.macauPlate);
      _mainlandPlate.text =
          mainlandPlateInput(data.mainlandPlate, data.ownership);
      _color.text = data.color;
    }
    _loadCategories();
  }

  Future<void> _loadCategories() async {
    try {
      final result = await _api.listVehicleCatalog();
      final categories = result['categories'];
      if (!mounted) return;
      setState(() {
        _categoryOptions = categories is List
            ? categories
                .whereType<Map>()
                .where((item) => item['enabled'] != false)
                .map((item) => item['name']?.toString() ?? '')
                .where((name) => name.isNotEmpty)
                .toList()
            : const [];
      });
    } on DriverApiException {
      // Keep the category selector empty when the catalog is unavailable.
    }
  }

  List<String> get _availablePlateTypes =>
      _ownership == '中國內地' ? const ['兩地牌'] : _plateTypeOptions;

  List<String> get _categoryChoices => _categoryOptions.isNotEmpty
      ? _categoryOptions
      : const ['轎車', 'MPV', '貨車'];

  List<_PlateInput> get _plateInputs {
    if (_plateType == '三地牌') {
      return [
        const _PlateInput('香港車牌', '請輸入香港車牌號碼'),
        _PlateInput(
          _ownership == '香港' ? '澳門車牌（選填）' : '澳門車牌',
          _ownership == '香港' ? '如有澳門車牌請填寫' : '請輸入澳門車牌號碼',
          required: _ownership != '香港',
        ),
        const _PlateInput('內地車牌', '請輸入內地車牌號碼'),
      ];
    }
    if (_plateType == '兩地牌') {
      final labels = _ownership == '中國內地'
          ? const ['內地車牌', '香港車牌']
          : ['$_ownership車牌', '內地車牌'];
      return [
        for (final label in labels) _PlateInput(label, '請輸入$label號碼'),
      ];
    }
    final local = _ownership == '中國內地' ? '內地' : _ownership;
    return [_PlateInput('$local車牌', '請輸入$local車牌號碼')];
  }

  TextEditingController _controllerFor(String label) {
    if (label.contains('香港')) return _hkPlate;
    if (label.contains('澳門')) return _macauPlate;
    return _mainlandPlate;
  }

  void _changeOwnership(String ownership) {
    setState(() {
      _ownership = ownership;
      _hkPlate.clear();
      _macauPlate.clear();
      _mainlandPlate.clear();
      if (!_availablePlateTypes.contains(_plateType)) {
        _plateType = '兩地牌';
      }
    });
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
        final bytes =
            await _readBlob(await canvas.toBlob('image/jpeg', quality));
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
    if (_isProcessingPhoto) return;
    final input = html.FileUploadInputElement()
      ..accept = 'image/jpeg,image/png,image/webp'
      ..multiple = false;
    html.document.body?.append(input);
    try {
      input.click();
      await input.onChange.first;
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
      setState(() => _isProcessingPhoto = true);
      try {
        const maxBytes = 2 * 1024 * 1024;
        final compressed = file.size > maxBytes;
        final bytes = compressed
            ? await _compressVehiclePhoto(file)
            : await _readBlob(file);
        if (!mounted) return;
        setState(() {
          _vehiclePhotoBytes = bytes;
          _vehiclePhotoName = compressed
              ? '${file.name.replaceFirst(RegExp(r'\.[^.]+$'), '')}.jpg'
              : file.name;
          _vehiclePhotoMime = compressed ? 'image/jpeg' : file.type;
        });
      } on Object catch (error) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(
              content: Text(error is StateError ? error.message : '圖片處理失敗')));
        }
      } finally {
        if (mounted) setState(() => _isProcessingPhoto = false);
      }
    } finally {
      input.remove();
    }
  }

  Future<void> _save() async {
    if (_category == null || _category!.trim().isEmpty) {
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('請選擇車輛類別')));
      return;
    }
    if (_plateInputs.any((input) =>
        input.required && _controllerFor(input.label).text.trim().isEmpty)) {
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('請完成所有車牌資料')));
      return;
    }
    final mainlandPlate = composeMainlandPlate(_mainlandPlate.text, _ownership);
    final plateError = vehiclePlateError(
      vehicleOwnership: _ownership,
      hongKongPlate: _hkPlate.text,
      macauPlate: _macauPlate.text,
      mainlandPlate: mainlandPlate,
    );
    if (plateError != null) {
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(plateError)));
      return;
    }
    setState(() => _isSaving = true);
    try {
      final fields = {
        'plateType': _plateType,
        'vehicleOwnership': _ownership,
        'hkPlate': normalizeHongKongPlate(_hkPlate.text).isEmpty
            ? null
            : normalizeHongKongPlate(_hkPlate.text),
        'macauPlate': normalizeMacauPlate(_macauPlate.text).isEmpty
            ? null
            : normalizeMacauPlate(_macauPlate.text),
        'mainlandPlate': normalizeMainlandPlate(mainlandPlate).isEmpty
            ? null
            : normalizeMainlandPlate(mainlandPlate),
        'vehicleCategory': _category,
        'vehicleColor': _color.text.trim(),
      };
      final vehicleId = widget.initialData?.id;
      if (vehicleId == null) {
        await _api.createVehicle(
          fields,
          vehiclePhotoBytes: _vehiclePhotoBytes,
          vehiclePhotoFilename: _vehiclePhotoName,
          vehiclePhotoMime: _vehiclePhotoMime,
        );
      } else {
        await _api.updateVehicle(
          vehicleId,
          fields,
          vehiclePhotoBytes: _vehiclePhotoBytes,
          vehiclePhotoFilename: _vehiclePhotoName,
          vehiclePhotoMime: _vehiclePhotoMime,
        );
      }
      if (!mounted) return;
      Navigator.of(context).pop(true);
    } on DriverApiException catch (error) {
      if (!mounted) return;
      setState(() => _isSaving = false);
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(error.message)));
    }
  }

  @override
  void dispose() {
    _hkPlate.dispose();
    _macauPlate.dispose();
    _mainlandPlate.dispose();
    _color.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return DriverPageShell(
      showBottomNavigation: false,
      selectedIndex: 2,
      topPadding: DriverSpacing.sm,
      bottomPadding: DriverSpacing.xl,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(children: [
            _BackButton(onTap: () => Navigator.of(context).pop()),
            const SizedBox(width: DriverSpacing.lg),
            Text(widget.initialData == null ? '新增車輛' : '修改車輛資料',
                style: const TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.w700,
                    color: DriverColors.text)),
          ]),
          const SizedBox(height: DriverSpacing.xl),
          _ChoiceField(
              label: '車輛歸屬地',
              values: _ownershipOptions,
              selected: _ownership,
              onChanged: _changeOwnership),
          const SizedBox(height: DriverSpacing.xl),
          _ChoiceField(
              label: '車牌類型',
              values: _availablePlateTypes,
              selected: _plateType,
              onChanged: (v) => setState(() => _plateType = v)),
          const SizedBox(height: DriverSpacing.xl),
          ..._plateInputs.expand((field) => [
                _PlateField(
                    label: field.label,
                    hint: field.hint,
                    controller: _controllerFor(field.label),
                    ownership: _ownership),
                const SizedBox(height: DriverSpacing.md),
              ]),
          _TextField(
              label: '車輛類別',
              hint: _category ?? '請選擇車輛類別',
              readOnly: true,
              icon: 'assets/chevron-down.svg',
              onTap: _selectCategory),
          const SizedBox(height: DriverSpacing.md),
          _TextField(label: '車輛顏色', hint: '例如：白色', controller: _color),
          const SizedBox(height: DriverSpacing.lg),
          const Text('車輛相片',
              style: TextStyle(
                  fontSize: DriverTypography.body,
                  fontWeight: FontWeight.w500,
                  color: DriverColors.text)),
          const SizedBox(height: DriverSpacing.md),
          InkWell(
            onTap: _isProcessingPhoto ? null : _selectVehiclePhoto,
            borderRadius: BorderRadius.circular(DriverRadii.input),
            child: Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                  color: DriverColors.surface,
                  border: Border.all(
                      color: DriverColors.activeBlue, style: BorderStyle.solid),
                  borderRadius: BorderRadius.circular(DriverRadii.input)),
              child: Column(children: [
                Container(
                    width: 40,
                    height: 40,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                        color: DriverColors.infoBackground,
                        borderRadius: BorderRadius.circular(DriverRadii.pill)),
                    child: SvgPicture.asset('assets/camera.svg',
                        width: 20, height: 20)),
                const SizedBox(height: DriverSpacing.md),
                Text(
                    _isProcessingPhoto
                        ? '正在壓縮圖片…'
                        : _vehiclePhotoName != null
                            ? '已選擇 $_vehiclePhotoName'
                            : widget.initialData?.hasPhoto == true
                                ? '已上傳車輛相片・點擊更換'
                                : '點擊上傳車輛相片',
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                        fontSize: DriverTypography.label,
                        fontWeight: FontWeight.w500,
                        color: DriverColors.activeBlue)),
                const SizedBox(height: DriverSpacing.sm),
                Text(
                    _vehiclePhotoBytes == null
                        ? '只允許 1 張 JPEG、PNG 或 WebP，相片上限 2 MB'
                        : '${(_vehiclePhotoBytes!.length / 1024 / 1024).toStringAsFixed(2)} MB・點擊更換',
                    style: const TextStyle(
                        fontSize: 11, color: DriverColors.secondaryText)),
              ]),
            ),
          ),
          const SizedBox(height: DriverSpacing.lg),
          ElevatedButton(
              onPressed: _isSaving ? null : _save,
              style: ElevatedButton.styleFrom(
                  backgroundColor: DriverColors.activeBlue,
                  foregroundColor: DriverColors.surface,
                  padding:
                      const EdgeInsets.symmetric(vertical: DriverSpacing.lg),
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(DriverRadii.input))),
              child: _isSaving
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Text('儲存',
                      style: TextStyle(
                          fontSize: DriverTypography.bodyLarge,
                          fontWeight: FontWeight.w700))),
        ],
      ),
    );
  }

  Future<void> _selectCategory() async {
    final value = await showModalBottomSheet<String>(
        context: context,
        builder: (context) => SafeArea(
            child: Column(
                mainAxisSize: MainAxisSize.min,
                children: _categoryChoices
                    .map((item) => ListTile(
                        title: Text(item),
                        onTap: () => Navigator.pop(context, item)))
                    .toList())));
    if (value != null) setState(() => _category = value);
  }
}

class _PlateInput {
  const _PlateInput(this.label, this.hint, {this.required = true});

  final String label;
  final String hint;
  final bool required;
}

class _BackButton extends StatelessWidget {
  const _BackButton({required this.onTap});
  final VoidCallback onTap;
  @override
  Widget build(BuildContext context) => Material(
        color: DriverColors.surface,
        borderRadius: BorderRadius.circular(18),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(18),
          child: Container(
            width: 36,
            height: 36,
            alignment: Alignment.center,
            decoration: BoxDecoration(
                border: Border.all(color: DriverColors.border),
                borderRadius: BorderRadius.circular(18)),
            child: const Text('‹',
                style: TextStyle(
                    fontSize: 24,
                    height: 1,
                    fontWeight: FontWeight.w700,
                    color: DriverColors.text)),
          ),
        ),
      );
}

class _ChoiceField extends StatelessWidget {
  const _ChoiceField(
      {required this.label,
      required this.values,
      required this.selected,
      required this.onChanged});
  final String label;
  final List<String> values;
  final String selected;
  final ValueChanged<String> onChanged;
  @override
  Widget build(BuildContext context) => Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(label,
              style: const TextStyle(
                  fontSize: DriverTypography.body,
                  fontWeight: FontWeight.w500,
                  color: DriverColors.text)),
          const SizedBox(height: DriverSpacing.md),
          Wrap(
              spacing: DriverSpacing.sm,
              runSpacing: DriverSpacing.sm,
              children: values.map((value) {
                final active = value == selected;
                return ChoiceChip(
                    label: Text(value),
                    selected: active,
                    onSelected: (_) => onChanged(value),
                    selectedColor: DriverColors.activeBlue,
                    backgroundColor: const Color(0xfff5f7fa),
                    side: BorderSide(
                        color: active
                            ? DriverColors.activeBlue
                            : DriverColors.border),
                    labelStyle: TextStyle(
                        fontSize: DriverTypography.body,
                        fontWeight: active ? FontWeight.w700 : FontWeight.w400,
                        color: active
                            ? DriverColors.surface
                            : DriverColors.labelText),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(DriverRadii.pill)));
              }).toList()),
        ],
      );
}

class _PlateField extends StatelessWidget {
  const _PlateField(
      {required this.label,
      required this.hint,
      required this.controller,
      required this.ownership});
  final String label;
  final String hint;
  final TextEditingController controller;
  final String ownership;
  @override
  Widget build(BuildContext context) => _TextField(
          label: label,
          hint: hint,
          controller: controller,
          prefixText: label.contains('內地')
              ? ownership == '中國內地'
                  ? '粵'
                  : '粵Z·'
              : null,
          suffixText: label.contains('內地')
              ? ownership == '香港'
                  ? '港'
                  : ownership == '澳門'
                      ? '澳'
                      : null
              : null,
          inputFormatters: [
            vehiclePlateFormatter(label.contains('香港')
                ? '香港'
                : label.contains('澳門')
                    ? '澳門'
                    : '內地')
          ]);
}

class _TextField extends StatelessWidget {
  const _TextField(
      {required this.label,
      required this.hint,
      this.controller,
      this.readOnly = false,
      this.icon,
      this.onTap,
      this.inputFormatters,
      this.prefixText,
      this.suffixText});
  final String label;
  final String hint;
  final TextEditingController? controller;
  final bool readOnly;
  final List<TextInputFormatter>? inputFormatters;
  final String? icon;
  final String? prefixText;
  final String? suffixText;
  final VoidCallback? onTap;
  @override
  Widget build(BuildContext context) {
    final border = OutlineInputBorder(
        borderRadius: BorderRadius.circular(DriverRadii.input),
        borderSide: const BorderSide(color: DriverColors.border));
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      Text(label,
          style: const TextStyle(
              fontSize: DriverTypography.body,
              fontWeight: FontWeight.w500,
              color: DriverColors.text)),
      const SizedBox(height: DriverSpacing.sm),
      TextField(
          controller: controller,
          inputFormatters: inputFormatters,
          readOnly: readOnly,
          onTap: onTap,
          style: const TextStyle(fontSize: 15, color: DriverColors.text),
          decoration: InputDecoration(
              hintText: hint,
              prefixText: prefixText,
              suffixText: suffixText,
              hintStyle: const TextStyle(
                  fontSize: 15, color: DriverColors.secondaryText),
              suffixIcon: icon == null
                  ? null
                  : Padding(
                      padding: const EdgeInsets.all(16),
                      child: SvgPicture.asset(icon!, width: 16, height: 16)),
              filled: true,
              fillColor: DriverColors.surface,
              contentPadding: const EdgeInsets.all(16),
              border: border,
              enabledBorder: border,
              focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(DriverRadii.input),
                  borderSide:
                      const BorderSide(color: DriverColors.activeBlue)))),
    ]);
  }
}
