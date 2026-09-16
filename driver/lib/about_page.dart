import 'package:flutter/material.dart';

import 'core/layout/driver_page_shell.dart';
import 'core/tokens/driver_tokens.dart';

class AboutPage extends StatelessWidget {
  const AboutPage({super.key});

  @override
  Widget build(BuildContext context) => DriverPageShell(
        showBottomNavigation: false,
        selectedIndex: 2,
        bottomPadding: DriverSpacing.xl,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const _PageHeader(title: '關於我們'),
            const SizedBox(height: DriverSpacing.xl),
            Container(
              padding: const EdgeInsets.all(DriverSpacing.xl),
              decoration: BoxDecoration(
                color: DriverColors.surface,
                border: Border.all(color: DriverColors.divider),
                borderRadius: BorderRadius.circular(DriverRadii.card),
              ),
              child: const Column(
                children: [
                  Icon(Icons.info_outline_rounded,
                      size: 48, color: DriverColors.activeBlue),
                  SizedBox(height: DriverSpacing.lg),
                  Text('Master Travel',
                      style: TextStyle(
                          fontSize: 22,
                          fontWeight: FontWeight.w700,
                          color: DriverColors.text)),
                  SizedBox(height: DriverSpacing.sm),
                  Text('司機服務平台',
                      style: TextStyle(
                          fontSize: DriverTypography.bodyLarge,
                          color: DriverColors.secondaryText)),
                  SizedBox(height: DriverSpacing.lg),
                  Text('提供跨境接送與司機接單服務，讓每一趟行程更安心、可靠。',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                          fontSize: DriverTypography.body,
                          height: 1.6,
                          color: DriverColors.secondaryText)),
                  SizedBox(height: DriverSpacing.xl),
                  Text('版本 1.0.0',
                      style: TextStyle(
                          fontSize: DriverTypography.caption,
                          color: DriverColors.secondaryText)),
                ],
              ),
            ),
          ],
        ),
      );
}

class _PageHeader extends StatelessWidget {
  const _PageHeader({required this.title});
  final String title;

  @override
  Widget build(BuildContext context) => Row(children: [
        IconButton(
          onPressed: () => Navigator.of(context).maybePop(),
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 20),
          color: DriverColors.text,
          tooltip: '返回',
        ),
        const SizedBox(width: DriverSpacing.sm),
        Text(title,
            style: const TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.w700,
                color: DriverColors.text)),
      ]);
}
