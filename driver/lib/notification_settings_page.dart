import 'dart:html' as html;

import 'package:flutter/material.dart';

import 'core/layout/driver_page_shell.dart';
import 'core/tokens/driver_tokens.dart';

class NotificationSettingsPage extends StatefulWidget {
  const NotificationSettingsPage({super.key});

  @override
  State<NotificationSettingsPage> createState() =>
      _NotificationSettingsPageState();
}

class _NotificationSettingsPageState extends State<NotificationSettingsPage> {
  static const _storageKey = 'driver_notification_settings';
  bool _pushEnabled = true;
  bool _orderEnabled = true;
  bool _settlementEnabled = true;
  bool _systemEnabled = true;

  @override
  void initState() {
    super.initState();
    final values = html.window.localStorage[_storageKey]?.split(',');
    if (values?.length == 4) {
      _pushEnabled = values![0] == '1';
      _orderEnabled = values[1] == '1';
      _settlementEnabled = values[2] == '1';
      _systemEnabled = values[3] == '1';
    }
  }

  void _save() {
    html.window.localStorage[_storageKey] = [
      _pushEnabled,
      _orderEnabled,
      _settlementEnabled,
      _systemEnabled,
    ].map((value) => value ? '1' : '0').join(',');
  }

  void _setValue(void Function() update) {
    setState(update);
    _save();
  }

  @override
  Widget build(BuildContext context) {
    return DriverPageShell(
      showBottomNavigation: false,
      selectedIndex: 2,
      bottomPadding: DriverSpacing.xl,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _SettingsHeader(title: '通知設定'),
          const SizedBox(height: DriverSpacing.xl),
          const Text('通知偏好',
              style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                  color: DriverColors.text)),
          const SizedBox(height: DriverSpacing.sm),
          _SettingsCard(children: [
            _ToggleRow(
                title: '推送通知',
                detail: '接收司機端重要通知',
                value: _pushEnabled,
                onChanged: (value) => _setValue(() => _pushEnabled = value)),
            _ToggleRow(
                title: '新訂單通知',
                detail: '有可接訂單時通知我',
                value: _orderEnabled,
                onChanged: (value) => _setValue(() => _orderEnabled = value)),
            _ToggleRow(
                title: '結算通知',
                detail: '結算完成或狀態更新時通知我',
                value: _settlementEnabled,
                onChanged: (value) =>
                    _setValue(() => _settlementEnabled = value)),
            _ToggleRow(
                title: '系統通知',
                detail: '服務公告及帳戶安全提醒',
                value: _systemEnabled,
                onChanged: (value) => _setValue(() => _systemEnabled = value)),
          ]),
        ],
      ),
    );
  }
}

class _SettingsHeader extends StatelessWidget {
  const _SettingsHeader({required this.title});
  final String title;

  @override
  Widget build(BuildContext context) => Row(children: [
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
                  borderRadius: BorderRadius.circular(18)),
              child: const Text('‹',
                  style: TextStyle(
                      fontSize: 24,
                      height: 1,
                      fontWeight: FontWeight.w700,
                      color: DriverColors.text)),
            ),
          ),
        ),
        const SizedBox(width: DriverSpacing.lg),
        Text(title,
            style: const TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.w700,
                color: DriverColors.text)),
      ]);
}

class _SettingsCard extends StatelessWidget {
  const _SettingsCard({required this.children});
  final List<Widget> children;

  @override
  Widget build(BuildContext context) => Container(
        decoration: BoxDecoration(
            color: DriverColors.surface,
            border: Border.all(color: DriverColors.divider),
            borderRadius: BorderRadius.circular(DriverRadii.card)),
        child: Column(children: [
          for (var i = 0; i < children.length; i++) ...[
            children[i],
            if (i < children.length - 1)
              const Divider(height: 1, color: DriverColors.divider)
          ]
        ]),
      );
}

class _ToggleRow extends StatelessWidget {
  const _ToggleRow(
      {required this.title,
      required this.detail,
      required this.value,
      required this.onChanged});
  final String title;
  final String detail;
  final bool value;
  final ValueChanged<bool> onChanged;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.symmetric(
            horizontal: DriverSpacing.lg, vertical: DriverSpacing.md),
        child: Row(children: [
          Expanded(
              child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                Text(title,
                    style: const TextStyle(
                        fontSize: DriverTypography.bodyLarge,
                        fontWeight: FontWeight.w600,
                        color: DriverColors.text)),
                const SizedBox(height: 4),
                Text(detail,
                    style: const TextStyle(
                        fontSize: DriverTypography.caption,
                        color: DriverColors.secondaryText))
              ])),
          Switch(
              value: value,
              onChanged: onChanged,
              activeTrackColor: DriverColors.activeBlue),
        ]),
      );
}
