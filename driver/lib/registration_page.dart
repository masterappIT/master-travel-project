import 'package:flutter/material.dart';

import 'app/route_names.dart';
import 'core/navigation/driver_navigation.dart';
import 'package:flutter/services.dart';
import 'package:flutter_svg/flutter_svg.dart';

import 'package:driver_web/core/tokens/driver_tokens.dart';

class RegistrationPage extends StatelessWidget {
  const RegistrationPage({super.key});

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
                    const _RegistrationCard(),
                    const SizedBox(height: DriverSpacing.xl),
                    SizedBox(
                      height: 56,
                      child: ElevatedButton(
                        onPressed: () => DriverNavigation.push(
                            context, DriverRouteNames.home),
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
                        child: const Text('提交審核',
                            style: TextStyle(
                                fontSize: DriverTypography.bodyLarge,
                                fontWeight: FontWeight.w700)),
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

class _RegistrationCard extends StatefulWidget {
  const _RegistrationCard();

  @override
  State<_RegistrationCard> createState() => _RegistrationCardState();
}

class _RegistrationCardState extends State<_RegistrationCard> {
  static const _regions = ['香港', '澳門', '中國內地'];
  static const _plateTypes = ['單牌', '兩地牌', '三地牌'];

  int _regionIndex = 0;
  String _plateType = '兩地牌';

  List<String> get _availablePlateTypes =>
      _regionIndex == 2 ? ['兩地牌'] : _plateTypes;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          border: Border.all(color: DriverColors.divider),
          borderRadius: BorderRadius.circular(DriverRadii.card),
          boxShadow: const [
            BoxShadow(
                color: Color(0x0a000000), blurRadius: 4, offset: Offset(0, 2))
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const _TextFieldSection(label: '姓名', hint: '請輸入司機姓名'),
            const SizedBox(height: DriverSpacing.lg),
            _ChoiceSection(
              label: '車輛歸屬地',
              options: _regions,
              selected: _regionIndex,
              onChanged: (index) => setState(() {
                _regionIndex = index;
                if (!_availablePlateTypes.contains(_plateType)) {
                  _plateType = '兩地牌';
                }
              }),
            ),
            const SizedBox(height: DriverSpacing.lg),
            _PlateSection(
              region: _regions[_regionIndex],
              plateType: _plateType,
              plateTypes: _availablePlateTypes,
              onPlateTypeChanged: (index) =>
                  setState(() => _plateType = _availablePlateTypes[index]),
            ),
            const SizedBox(height: DriverSpacing.lg),
            const _PhoneSection(),
            const SizedBox(height: DriverSpacing.lg),
            const _TextFieldSection(
                label: '車輛類別',
                hint: '請選擇車輛類別',
                trailing: 'assets/chevron-down.svg'),
            const SizedBox(height: DriverSpacing.lg),
            const _TextFieldSection(label: '車輛顏色', hint: '例如：白色'),
            const SizedBox(height: DriverSpacing.lg),
            const _VehiclePhotoSection(),
          ],
        ),
      );
}

class _TextFieldSection extends StatelessWidget {
  const _TextFieldSection(
      {required this.label, required this.hint, this.trailing});
  final String label;
  final String hint;
  final String? trailing;

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
              readOnly: trailing != null,
              decoration: InputDecoration(
                hintText: hint,
                hintStyle: const TextStyle(
                    fontSize: 15, color: DriverColors.secondaryText),
                border: InputBorder.none,
                contentPadding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                suffixIcon: trailing == null
                    ? null
                    : Padding(
                        padding: const EdgeInsets.all(16),
                        child:
                            SvgPicture.asset(trailing!, width: 16, height: 16),
                      ),
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
                color: selected ? Colors.white : DriverColors.labelText)),
      );
}

class _PlateSection extends StatelessWidget {
  const _PlateSection({
    required this.region,
    required this.plateType,
    required this.plateTypes,
    required this.onPlateTypeChanged,
  });
  final String region;
  final String plateType;
  final List<String> plateTypes;
  final ValueChanged<int> onPlateTypeChanged;

  List<String> _plateLabels() {
    if (plateType == '三地牌') return ['香港車牌', '澳門車牌', '內地車牌'];
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
        _TextFieldSection(label: label, hint: '請輸入$label號碼'),
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

class _PhoneSection extends StatefulWidget {
  const _PhoneSection();

  @override
  State<_PhoneSection> createState() => _PhoneSectionState();
}

class _PhoneSectionState extends State<_PhoneSection> {
  String _region = '香港';

  @override
  Widget build(BuildContext context) => Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text('聯繫電話',
              style: TextStyle(
                  fontSize: DriverTypography.body,
                  fontWeight: FontWeight.w500,
                  color: DriverColors.text)),
          const SizedBox(height: DriverSpacing.md),
          LayoutBuilder(
            builder: (context, constraints) {
              final fields = [
                _PhoneField(
                  label: '香港/澳門號碼',
                  prefix: _region == '香港' ? '+852' : '+853',
                  regionOptions: const {'香港': '+852', '澳門': '+853'},
                  selectedRegion: _region,
                  onRegionChanged: (region) => setState(() => _region = region),
                ),
                const _PhoneField(label: '中國內地號碼', prefix: '+86'),
              ];
              return constraints.maxWidth < 370
                  ? Column(children: [
                      fields[0],
                      const SizedBox(height: DriverSpacing.md),
                      fields[1]
                    ])
                  : Row(children: [
                      Expanded(child: fields[0]),
                      const SizedBox(width: DriverSpacing.md),
                      Expanded(child: fields[1])
                    ]);
            },
          ),
        ],
      );
}

class _PhoneField extends StatelessWidget {
  const _PhoneField({
    required this.label,
    required this.prefix,
    this.regionOptions,
    this.selectedRegion,
    this.onRegionChanged,
  });
  final String label;
  final String prefix;
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
                  keyboardType: TextInputType.number,
                  inputFormatters: [
                    FilteringTextInputFormatter.digitsOnly,
                    LengthLimitingTextInputFormatter(8),
                  ],
                  decoration: _registrationInputDecoration(
                    hintText: '8位電話號碼',
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
  const _VehiclePhotoSection();
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
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 20),
            decoration: BoxDecoration(
                color: Colors.white,
                border: Border.all(
                    color: DriverColors.primary, style: BorderStyle.none),
                borderRadius: BorderRadius.circular(DriverRadii.input)),
            child: CustomPaint(
              painter:
                  _DashedBorderPainter(color: DriverColors.primary, radius: 12),
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
                  const Text('點擊上傳車輛相片',
                      style: TextStyle(
                          fontSize: DriverTypography.label,
                          fontWeight: FontWeight.w500,
                          color: DriverColors.primary)),
                  const SizedBox(height: DriverSpacing.xs),
                  const Text('建議上傳車頭、車身、車尾照片，方便審核',
                      style: TextStyle(
                          fontSize: 11, color: DriverColors.secondaryText),
                      textAlign: TextAlign.center),
                ]),
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
      fillColor: Colors.white,
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
    color: Colors.white,
    border: Border.all(color: DriverColors.border),
    borderRadius: BorderRadius.circular(DriverRadii.input));
