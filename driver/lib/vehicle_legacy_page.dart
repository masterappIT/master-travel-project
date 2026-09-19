import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

import 'core/tokens/driver_tokens.dart';

/// Legacy vehicle data preview screen retained for backwards compatibility.
class VehicleLegacyPage extends StatelessWidget {
  const VehicleLegacyPage({super.key});

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
                padding: const EdgeInsets.all(DriverSpacing.xl),
                child: ConstrainedBox(
                  constraints: BoxConstraints(
                    minHeight: constraints.maxHeight - 48,
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      _VehicleHeader(
                        onBack: () => Navigator.of(context).maybePop(),
                      ),
                      const SizedBox(height: DriverSpacing.lg),
                      const _VehicleCard(),
                      const SizedBox(height: DriverSpacing.xl),
                      SizedBox(
                        height: 56,
                        child: ElevatedButton(
                          onPressed: () =>
                              ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('編輯功能請由個人資料頁開啟')),
                          ),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: DriverColors.activeBlue,
                            foregroundColor: DriverColors.surface,
                            elevation: 0,
                            shape: RoundedRectangleBorder(
                              borderRadius:
                                  BorderRadius.circular(DriverRadii.input),
                            ),
                            padding: const EdgeInsets.symmetric(
                              horizontal: DriverSpacing.xl,
                              vertical: DriverSpacing.lg,
                            ),
                          ),
                          child: const Text(
                            '編輯資料',
                            style: TextStyle(
                              fontSize: DriverTypography.bodyLarge,
                              fontWeight: FontWeight.w700,
                            ),
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
      ),
    );
  }
}

class _VehicleHeader extends StatelessWidget {
  const _VehicleHeader({required this.onBack});

  final VoidCallback onBack;

  @override
  Widget build(BuildContext context) => Row(
        children: [
          Material(
            color: DriverColors.surface,
            borderRadius: BorderRadius.circular(18),
            child: InkWell(
              onTap: onBack,
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
          const Text(
            '個人資料',
            style: TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.w700,
              color: DriverColors.text,
            ),
          ),
        ],
      );
}

class _VehicleCard extends StatelessWidget {
  const _VehicleCard();

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(DriverSpacing.lg),
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
        child: const Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _VehicleIdentity(),
            SizedBox(height: DriverSpacing.lg),
            Divider(height: 1, color: DriverColors.background),
            SizedBox(height: DriverSpacing.md),
            _VehicleInfoRow(label: '姓名', value: '陳大文'),
            _VehicleInfoRow(label: '電話 (香港/澳門)', value: '+852 9123 4567'),
            _VehicleInfoRow(label: '電話 (中國內地)', value: '+86 138 0000 1234'),
            _VehicleInfoRow(label: '車輛歸屬地', value: '香港'),
            _VehicleInfoRow(label: '車牌類型', value: '兩地牌'),
          ],
        ),
      );
}

class _VehicleIdentity extends StatelessWidget {
  const _VehicleIdentity();

  @override
  Widget build(BuildContext context) => Row(
        children: [
          Container(
            width: 56,
            height: 56,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: DriverColors.infoBackground,
              borderRadius: BorderRadius.circular(28),
            ),
            child: SvgPicture.asset('assets/profile-user.svg',
                width: 24, height: 24),
          ),
          const SizedBox(width: DriverSpacing.lg),
          const Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('陳大文',
                  style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w700,
                      color: DriverColors.text)),
              SizedBox(height: DriverSpacing.xs),
              DecoratedBox(
                decoration: BoxDecoration(
                    color: DriverColors.successBackground,
                    borderRadius:
                        BorderRadius.all(Radius.circular(DriverRadii.pill))),
                child: Padding(
                  padding: EdgeInsets.symmetric(
                      horizontal: DriverSpacing.sm, vertical: 2),
                  child: Text('已認證司機',
                      style: TextStyle(
                          fontSize: DriverTypography.caption,
                          fontWeight: FontWeight.w700,
                          color: DriverColors.darkGreen)),
                ),
              ),
            ],
          ),
        ],
      );
}

class _VehicleInfoRow extends StatelessWidget {
  const _VehicleInfoRow({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(bottom: DriverSpacing.md),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Flexible(
              child: Text(label,
                  style: const TextStyle(
                      fontSize: DriverTypography.body,
                      color: DriverColors.secondaryText)),
            ),
            const SizedBox(width: DriverSpacing.md),
            Flexible(
              child: Text(value,
                  textAlign: TextAlign.right,
                  style: const TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w500,
                      color: DriverColors.text)),
            ),
          ],
        ),
      );
}
