import 'package:flutter/material.dart';
import 'core/widgets/driver_overlays.dart';

import 'package:driver_web/core/api/driver_api_client.dart';
import 'package:driver_web/core/tokens/driver_tokens.dart';

/// Self-contained driver profile preview and edit screen.
///
/// The page owns its editable state and can be used without the driver's
/// navigation, shell, or data modules.
class DriverProfilePage extends StatefulWidget {
  const DriverProfilePage({
    super.key,
    this.initialName = '',
    this.initialHongKongMacauPhone = '',
    this.initialMainlandPhone = '',
  });

  final String initialName;
  final String initialHongKongMacauPhone;
  final String initialMainlandPhone;

  @override
  State<DriverProfilePage> createState() => _DriverProfilePageState();
}

class _DriverProfilePageState extends State<DriverProfilePage> {
  bool _isEditing = false;
  bool _isSaving = false;
  late final TextEditingController _nameController;
  late final TextEditingController _hongKongMacauPhoneController;
  late final TextEditingController _mainlandPhoneController;
  String _hongKongMacauRegion = '香港';

  static const _phoneCodes = {'香港': '+852', '澳門': '+853'};

  @override
  void initState() {
    super.initState();
    _nameController = TextEditingController(text: widget.initialName);
    _hongKongMacauRegion =
        widget.initialHongKongMacauPhone.trim().startsWith('+853')
            ? '澳門'
            : '香港';
    _hongKongMacauPhoneController = TextEditingController(
        text: _localPhoneNumber(widget.initialHongKongMacauPhone));
    _mainlandPhoneController = TextEditingController(
        text: _localPhoneNumber(widget.initialMainlandPhone));
  }

  @override
  void dispose() {
    _nameController.dispose();
    _hongKongMacauPhoneController.dispose();
    _mainlandPhoneController.dispose();
    super.dispose();
  }

  static String _localPhoneNumber(String value) =>
      value.trim().replaceFirst(RegExp(r'^\+\d{2,3}\s*'), '');

  void _startEditing() => setState(() => _isEditing = true);

  void _cancelEditing() {
    _nameController.text = widget.initialName;
    _hongKongMacauPhoneController.text =
        _localPhoneNumber(widget.initialHongKongMacauPhone);
    _mainlandPhoneController.text =
        _localPhoneNumber(widget.initialMainlandPhone);
    setState(() {
      _hongKongMacauRegion =
          widget.initialHongKongMacauPhone.trim().startsWith('+853')
              ? '澳門'
              : '香港';
      _isEditing = false;
    });
  }

  Future<void> _saveProfile() async {
    FocusScope.of(context).unfocus();
    final name = _nameController.text.trim();
    if (name.isEmpty) {
      showDriverNotice(context, '請輸入姓名');
      return;
    }
    setState(() => _isSaving = true);
    try {
      final hongKongMacauPhone = _hongKongMacauPhoneController.text
          .trim()
          .replaceFirst(RegExp(r'^\+85[23]\s*'), '');
      final mainlandPhone = _mainlandPhoneController.text
          .trim()
          .replaceFirst(RegExp(r'^\+86\s*'), '');
      await DriverApiClient.instance.updateProfile({
        'name': name,
        'hongKongMacauCountryCode': _phoneCodes[_hongKongMacauRegion],
        'hongKongMacauPhone': hongKongMacauPhone,
        'mainlandPhone': mainlandPhone,
      });
      if (!mounted) return;
      final result = <String, String>{
        'name': name,
        'hongKongMacauPhone':
            '${_phoneCodes[_hongKongMacauRegion]} $hongKongMacauPhone',
        'mainlandPhone': '+86 $mainlandPhone',
      };
      setState(() => _isEditing = false);
      showDriverNotice(context, '個人資料已儲存');
      Navigator.of(context).pop(result);
    } on DriverApiException catch (error) {
      if (mounted) {
        showDriverNotice(context, error.message);
      }
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: DriverColors.background,
      appBar: PreferredSize(
        preferredSize: const Size.fromHeight(68),
        child: SafeArea(
          bottom: false,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(24, 12, 24, 8),
            child: Row(
              children: [
                Material(
                  color: DriverColors.surface,
                  borderRadius: BorderRadius.circular(18),
                  child: InkWell(
                    onTap: () => Navigator.of(context).maybePop(),
                    borderRadius: BorderRadius.circular(18),
                    child: Container(
                      width: 36,
                      height: 36,
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                        border: Border.all(color: DriverColors.border),
                        borderRadius: BorderRadius.circular(18),
                      ),
                      child: const Text(
                        '‹',
                        style: TextStyle(
                          fontSize: 24,
                          height: 1,
                          fontWeight: FontWeight.w700,
                          color: DriverColors.text,
                        ),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: DriverSpacing.lg),
                const Expanded(
                  child: Text(
                    '個人資料',
                    style: TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.w700,
                      color: DriverColors.text,
                    ),
                  ),
                ),
                if (!_isEditing)
                  TextButton(
                    key: const ValueKey('driver-profile-edit'),
                    onPressed: _startEditing,
                    child: const Text(
                      '修改',
                      style: TextStyle(
                        color: DriverColors.activeBlue,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ),
      ),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(24, 8, 24, 32),
          children: [
            _ProfileIdentity(name: _nameController.text),
            const SizedBox(height: DriverSpacing.xl),
            _SectionCard(
              title: '基本資料',
              children: [
                _ProfileField(
                  label: '姓名',
                  controller: _nameController,
                  editing: _isEditing,
                  icon: Icons.person_outline,
                ),
                LayoutBuilder(
                  builder: (context, constraints) {
                    final fields = [
                      _ProfilePhoneField(
                        label: '香港/澳門號碼',
                        controller: _hongKongMacauPhoneController,
                        editing: _isEditing,
                        region: _hongKongMacauRegion,
                        regionCodes: _phoneCodes,
                        onRegionChanged: (region) => setState(
                          () => _hongKongMacauRegion = region,
                        ),
                      ),
                      _ProfilePhoneField(
                        label: '中國內地號碼',
                        controller: _mainlandPhoneController,
                        editing: _isEditing,
                        prefix: '+86',
                      ),
                    ];
                    return constraints.maxWidth < 370
                        ? Column(children: [
                            fields[0],
                            const SizedBox(height: DriverSpacing.md),
                            fields[1],
                          ])
                        : Row(children: [
                            Expanded(child: fields[0]),
                            const SizedBox(width: DriverSpacing.md),
                            Expanded(child: fields[1]),
                          ]);
                  },
                ),
              ],
            ),
            if (_isEditing) ...[
              const SizedBox(height: DriverSpacing.xl),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      key: const ValueKey('driver-profile-cancel'),
                      onPressed: _cancelEditing,
                      child: const Text('取消'),
                    ),
                  ),
                  const SizedBox(width: DriverSpacing.md),
                  Expanded(
                    child: ElevatedButton(
                      key: const ValueKey('driver-profile-save'),
                      onPressed: _isSaving ? null : _saveProfile,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: DriverColors.activeBlue,
                        foregroundColor: DriverColors.surface,
                      ),
                      child: Text(_isSaving ? '儲存中…' : '儲存'),
                    ),
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _ProfileIdentity extends StatelessWidget {
  const _ProfileIdentity({required this.name});
  final String name;

  @override
  Widget build(BuildContext context) => Column(
        children: [
          CircleAvatar(
            radius: 38,
            backgroundColor: DriverColors.infoBackground,
            child: Text(
              name.isEmpty ? '司' : name.substring(0, 1),
              style: const TextStyle(
                fontSize: 28,
                fontWeight: FontWeight.w700,
                color: DriverColors.activeBlue,
              ),
            ),
          ),
          const SizedBox(height: DriverSpacing.md),
          Text(
            name.isEmpty ? '未填寫姓名' : name,
            style: const TextStyle(
              fontSize: 22,
              fontWeight: FontWeight.w700,
              color: DriverColors.text,
            ),
          ),
          const SizedBox(height: 6),
          Container(
            padding: const EdgeInsets.symmetric(
                horizontal: 10, vertical: DriverSpacing.xs),
            decoration: BoxDecoration(
              color: DriverColors.successBackground,
              borderRadius: BorderRadius.circular(DriverRadii.pill),
            ),
            child: const Text(
              '已認證司機',
              style: TextStyle(
                fontSize: DriverTypography.caption,
                fontWeight: FontWeight.w700,
                color: DriverColors.darkGreen,
              ),
            ),
          ),
        ],
      );
}

class _SectionCard extends StatelessWidget {
  const _SectionCard({required this.title, required this.children});
  final String title;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 12),
        decoration: BoxDecoration(
          color: DriverColors.surface,
          border: Border.all(color: DriverColors.divider),
          borderRadius: BorderRadius.circular(DriverRadii.card),
          boxShadow: const [
            BoxShadow(
              color: Color(0x1238434a),
              blurRadius: 4,
              offset: Offset(0, 2),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              title,
              style: const TextStyle(
                fontSize: DriverTypography.bodyLarge,
                fontWeight: FontWeight.w700,
                color: DriverColors.text,
              ),
            ),
            const SizedBox(height: DriverSpacing.md),
            ...children,
          ],
        ),
      );
}

class _ProfilePhoneField extends StatelessWidget {
  const _ProfilePhoneField({
    required this.label,
    required this.controller,
    required this.editing,
    this.region,
    this.regionCodes,
    this.onRegionChanged,
    this.prefix,
  });

  final String label;
  final TextEditingController controller;
  final bool editing;
  final String? region;
  final Map<String, String>? regionCodes;
  final ValueChanged<String>? onRegionChanged;
  final String? prefix;

  void _showRegionPicker(BuildContext context) {
    showDriverDialog<void>(
      context: context,
      builder: (dialogContext) => DriverDialog(
        title: const Text('選擇區號'),
        contentPadding: const EdgeInsets.symmetric(vertical: DriverSpacing.sm),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            for (final entry in regionCodes!.entries)
              ListTile(
                title: Text('${entry.key} ${entry.value}'),
                trailing: entry.key == region
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
  Widget build(BuildContext context) {
    final selectedPrefix = regionCodes?[region] ?? prefix ?? '';
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(label,
            style: const TextStyle(
                fontSize: DriverTypography.body,
                fontWeight: FontWeight.w500,
                color: DriverColors.text)),
        const SizedBox(height: DriverSpacing.md),
        Row(
          children: [
            SizedBox(
              height: 50,
              width: regionCodes == null ? 72 : 104,
              child: regionCodes == null
                  ? Container(
                      alignment: Alignment.center,
                      decoration: _profileFieldDecoration(),
                      child: Text(selectedPrefix,
                          style: const TextStyle(
                              fontSize: DriverTypography.body,
                              fontWeight: FontWeight.w500,
                              color: DriverColors.text)),
                    )
                  : Material(
                      color: Colors.transparent,
                      child: InkWell(
                        borderRadius: BorderRadius.circular(DriverRadii.input),
                        onTap: () => _showRegionPicker(context),
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: DriverSpacing.sm),
                          decoration: _profileFieldDecoration(),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Flexible(
                                child: Text(
                                  '$region $selectedPrefix',
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
                child: editing
                    ? TextField(
                        controller: controller,
                        keyboardType: TextInputType.phone,
                        decoration: _profileInputDecoration('8位電話號碼'),
                      )
                    : Container(
                        alignment: Alignment.centerLeft,
                        padding: const EdgeInsets.symmetric(
                            horizontal: DriverSpacing.md),
                        decoration: _profileFieldDecoration(),
                        child: Text(controller.text,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                                fontSize: DriverTypography.body,
                                color: DriverColors.secondaryText)),
                      ),
              ),
            ),
          ],
        ),
      ],
    );
  }

  InputDecoration _profileInputDecoration(String hintText) => InputDecoration(
        isDense: true,
        hintText: hintText,
        contentPadding: const EdgeInsets.symmetric(
            horizontal: DriverSpacing.md, vertical: 14),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(DriverRadii.input),
          borderSide: const BorderSide(color: DriverColors.border),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(DriverRadii.input),
          borderSide: const BorderSide(color: DriverColors.border),
        ),
      );

  BoxDecoration _profileFieldDecoration() => BoxDecoration(
        color: DriverColors.surface,
        border: Border.all(color: DriverColors.border),
        borderRadius: BorderRadius.circular(DriverRadii.input),
      );
}

class _ProfileField extends StatelessWidget {
  const _ProfileField({
    required this.label,
    required this.controller,
    required this.editing,
    required this.icon,
  });

  final String label;
  final TextEditingController controller;
  final bool editing;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    final content = editing
        ? TextField(
            controller: controller,
            decoration: InputDecoration(
              isDense: true,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(10),
              ),
            ),
          )
        : Text(
            controller.text,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              fontSize: 15,
              color: DriverColors.secondaryText,
            ),
          );

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 14),
      child: Row(
        crossAxisAlignment:
            editing ? CrossAxisAlignment.start : CrossAxisAlignment.center,
        children: [
          Icon(icon, size: 20, color: DriverColors.secondaryText),
          const SizedBox(width: DriverSpacing.md),
          SizedBox(
            width: 112,
            child: Text(
              label,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                fontSize: DriverTypography.body,
                height: 1.25,
                color: DriverColors.labelText,
              ),
            ),
          ),
          const SizedBox(width: DriverSpacing.sm),
          Expanded(child: content),
        ],
      ),
    );
  }
}
