import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

import 'core/layout/driver_page_shell.dart';
import 'core/tokens/driver_tokens.dart';

class DriverSupportContext {
  const DriverSupportContext({required this.tripId, required this.statusLabel});
  final String tripId;
  final String statusLabel;
}

class ContactSupportPage extends StatelessWidget {
  const ContactSupportPage({super.key, this.trip});
  final DriverSupportContext? trip;

  @override
  Widget build(BuildContext context) => DriverPageShell(
        showBottomNavigation: false,
        selectedIndex: 2,
        bottomPadding: DriverSpacing.xl,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(children: [
              IconButton(
                onPressed: () => Navigator.of(context).maybePop(),
                icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 20),
                color: DriverColors.text,
                tooltip: '返回',
              ),
              const SizedBox(width: DriverSpacing.sm),
              const Text('聯繫客服',
                  style: TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.w700,
                      color: DriverColors.text)),
            ]),
            const SizedBox(height: DriverSpacing.xl),
            if (trip != null) ...[
              _SupportCard(
                  child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Wrap(
                    alignment: WrapAlignment.spaceBetween,
                    crossAxisAlignment: WrapCrossAlignment.center,
                    spacing: DriverSpacing.sm,
                    runSpacing: DriverSpacing.sm,
                    children: [
                      const Text('關於此訂單／行程',
                          style: TextStyle(
                              fontSize: DriverTypography.bodyLarge,
                              fontWeight: FontWeight.w700,
                              color: DriverColors.text)),
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: DriverSpacing.md,
                            vertical: DriverSpacing.xs),
                        decoration: BoxDecoration(
                            color: DriverColors.infoBackground,
                            borderRadius:
                                BorderRadius.circular(DriverRadii.pill)),
                        child: Text(trip!.statusLabel,
                            style: const TextStyle(
                                fontSize: DriverTypography.caption,
                                color: DriverColors.activeBlue)),
                      ),
                    ],
                  ),
                  const SizedBox(height: DriverSpacing.sm),
                  SelectableText('訂單 ID：${trip!.tripId}',
                      style: const TextStyle(
                          fontSize: DriverTypography.label,
                          color: DriverColors.secondaryText)),
                  const SizedBox(height: DriverSpacing.sm),
                  const Text('此處僅顯示頁面資訊；客服接通後仍須核對訂單。',
                      style: TextStyle(
                          fontSize: DriverTypography.caption,
                          color: DriverColors.mutedText)),
                ],
              )),
              const SizedBox(height: DriverSpacing.lg),
            ],
            _SupportCard(
                child: Column(children: [
              SvgPicture.asset('assets/profile-headphones.svg',
                  width: DriverSpacing.xl * 2, height: DriverSpacing.xl * 2),
              const SizedBox(height: DriverSpacing.lg),
              const Text('您好，有甚麼可以幫您？',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                      fontSize: DriverTypography.bodyLarge,
                      fontWeight: FontWeight.w700,
                      color: DriverColors.text)),
              const SizedBox(height: DriverSpacing.sm),
              const Text('未來可在這裡與客服人員交流訂單、行程與帳戶問題，並傳送圖片、影片、語音訊息或接聽語音通話。',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                      fontSize: DriverTypography.body,
                      height: 1.5,
                      color: DriverColors.secondaryText)),
            ])),
            const SizedBox(height: DriverSpacing.lg),
            Semantics(
              liveRegion: true,
              child: Container(
                padding: const EdgeInsets.all(DriverSpacing.lg),
                decoration: BoxDecoration(
                    color: DriverColors.infoBackground,
                    border: Border.all(color: DriverColors.border),
                    borderRadius: BorderRadius.circular(DriverRadii.card)),
                child: const Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('客服服務尚未接通',
                          style: TextStyle(
                              fontSize: DriverTypography.body,
                              fontWeight: FontWeight.w700,
                              color: DriverColors.activeBlue)),
                      SizedBox(height: DriverSpacing.sm),
                      Text('目前無法傳送訊息或附件，也無法撥打電話。請勿在此輸入緊急事項。',
                          style: TextStyle(
                              fontSize: DriverTypography.label,
                              height: 1.5,
                              color: DriverColors.secondaryText)),
                    ]),
              ),
            ),
            const SizedBox(height: DriverSpacing.xl),
            _SupportCard(
                child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                  const Wrap(
                      spacing: DriverSpacing.sm,
                      runSpacing: DriverSpacing.sm,
                      children: [
                        _UnavailableAction('圖片'),
                        _UnavailableAction('影片'),
                        _UnavailableAction('語音訊息'),
                        _UnavailableAction('語音通話'),
                      ]),
                  const SizedBox(height: DriverSpacing.md),
                  Row(children: [
                    Expanded(
                        child: TextField(
                      enabled: false,
                      decoration: InputDecoration(
                        hintText: '客服服務接通後可輸入訊息',
                        filled: true,
                        fillColor: DriverColors.background,
                        border: OutlineInputBorder(
                            borderRadius:
                                BorderRadius.circular(DriverRadii.input),
                            borderSide: BorderSide.none),
                      ),
                    )),
                    const SizedBox(width: DriverSpacing.sm),
                    FilledButton(onPressed: null, child: const Text('發送')),
                  ]),
                ])),
          ],
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
