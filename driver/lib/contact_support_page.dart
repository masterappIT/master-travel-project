import 'package:flutter/material.dart';

import 'core/layout/driver_page_shell.dart';
import 'core/tokens/driver_tokens.dart';

class ContactSupportPage extends StatelessWidget {
  const ContactSupportPage({super.key});

  @override
  Widget build(BuildContext context) => DriverPageShell(
        showBottomNavigation: false,
        selectedIndex: 2,
        bottomPadding: DriverSpacing.xl,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const _PageHeader(title: '聯繫客服'),
            const SizedBox(height: DriverSpacing.xl),
            Container(
              padding: const EdgeInsets.all(DriverSpacing.lg),
              decoration: BoxDecoration(
                color: DriverColors.surface,
                border: Border.all(color: DriverColors.divider),
                borderRadius: BorderRadius.circular(DriverRadii.card),
              ),
              child: const Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('需要協助？',
                      style: TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.w700,
                          color: DriverColors.text)),
                  SizedBox(height: DriverSpacing.sm),
                  Text('如有訂單、帳戶或平台使用問題，請透過以下方式聯絡客服。',
                      style: TextStyle(
                          fontSize: DriverTypography.body,
                          height: 1.5,
                          color: DriverColors.secondaryText)),
                  SizedBox(height: DriverSpacing.lg),
                  Divider(color: DriverColors.divider),
                  ListTile(
                    contentPadding: EdgeInsets.zero,
                    leading: Icon(Icons.headset_mic_outlined,
                        color: DriverColors.activeBlue),
                    title: Text('客服專線'),
                    subtitle: Text('+852 3000 0000'),
                  ),
                  ListTile(
                    contentPadding: EdgeInsets.zero,
                    leading: Icon(Icons.email_outlined,
                        color: DriverColors.activeBlue),
                    title: Text('客服電郵'),
                    subtitle: Text('support@master-travel.example'),
                  ),
                  ListTile(
                    contentPadding: EdgeInsets.zero,
                    leading: Icon(Icons.schedule_outlined,
                        color: DriverColors.activeBlue),
                    title: Text('服務時間'),
                    subtitle: Text('每日 09:00–18:00'),
                  ),
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
