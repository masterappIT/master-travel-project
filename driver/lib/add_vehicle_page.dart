import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

import 'core/api/driver_api_client.dart';
import 'core/layout/driver_page_shell.dart';
import 'core/tokens/driver_tokens.dart';

class VehicleFormData {
  const VehicleFormData({
    required this.ownership,
    required this.plateType,
    required this.category,
    required this.hongKongPlate,
    required this.macauPlate,
    required this.mainlandPlate,
    required this.color,
  });

  final String ownership;
  final String plateType;
  final String category;
  final String hongKongPlate;
  final String macauPlate;
  final String mainlandPlate;
  final String color;
}

class AddVehiclePage extends StatefulWidget {
  const AddVehiclePage({super.key, this.initialData});

  final VehicleFormData? initialData;

  @override
  State<AddVehiclePage> createState() => _AddVehiclePageState();
}

class _AddVehiclePageState extends State<AddVehiclePage> {
  static const _ownershipOptions = ['香港', '澳門', '中國內地'];
  static const _plateTypeOptions = ['單牌', '兩地牌', '三地牌'];

  String _ownership = '香港';
  String _plateType = '兩地牌';
  String? _category;
  final _hkPlate = TextEditingController();
  final _macauPlate = TextEditingController();
  final _mainlandPlate = TextEditingController();
  final _color = TextEditingController();

  List<String> _categoryOptions = const [];
  bool _loadingCategories = true;
  bool _isSaving = false;

  @override
  void initState() {
    super.initState();
    final data = widget.initialData;
    if (data != null) {
      _ownership = data.ownership;
      _plateType = data.plateType;
      _category = data.category;
      _hkPlate.text = data.hongKongPlate;
      _macauPlate.text = data.macauPlate;
      _mainlandPlate.text = data.mainlandPlate;
      _color.text = data.color;
    }
    _loadCategories();
  }

  Future<void> _loadCategories() async {
    try {
      final result = await DriverApiClient.instance.listVehicleCatalog();
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
        _loadingCategories = false;
      });
    } on DriverApiException {
      if (mounted) setState(() => _loadingCategories = false);
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
      if (!_availablePlateTypes.contains(_plateType)) {
        _plateType = '兩地牌';
      }
    });
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
    setState(() => _isSaving = true);
    try {
      await DriverApiClient.instance.updateProfile({
        'plateType': _plateType,
        'vehicleOwnership': _ownership,
        'hkPlate': _hkPlate.text.trim().isEmpty ? null : _hkPlate.text.trim(),
        'macauPlate':
            _macauPlate.text.trim().isEmpty ? null : _macauPlate.text.trim(),
        'mainlandPlate': _mainlandPlate.text.trim().isEmpty
            ? null
            : _mainlandPlate.text.trim(),
        'vehicleCategory': _category,
        'vehicleColor': _color.text.trim(),
      });
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
                    controller: _controllerFor(field.label)),
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
            onTap: () => ScaffoldMessenger.of(context)
                .showSnackBar(const SnackBar(content: Text('車輛相片上傳功能尚未開放'))),
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
                const Text('點擊上傳車輛相片',
                    style: TextStyle(
                        fontSize: DriverTypography.label,
                        fontWeight: FontWeight.w500,
                        color: DriverColors.activeBlue)),
                const SizedBox(height: DriverSpacing.sm),
                const Text('建議上傳正面、側面、車頭照片',
                    style: TextStyle(
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
      {required this.label, required this.hint, required this.controller});
  final String label;
  final String hint;
  final TextEditingController controller;
  @override
  Widget build(BuildContext context) =>
      _TextField(label: label, hint: hint, controller: controller);
}

class _TextField extends StatelessWidget {
  const _TextField(
      {required this.label,
      required this.hint,
      this.controller,
      this.readOnly = false,
      this.icon,
      this.onTap});
  final String label;
  final String hint;
  final TextEditingController? controller;
  final bool readOnly;
  final String? icon;
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
          readOnly: readOnly,
          onTap: onTap,
          style: const TextStyle(fontSize: 15, color: DriverColors.text),
          decoration: InputDecoration(
              hintText: hint,
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
