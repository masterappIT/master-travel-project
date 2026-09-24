import 'package:flutter/material.dart';

import 'core/api/driver_api_client.dart';
import 'core/layout/driver_page_shell.dart';
import 'core/platform/new_order_alert.dart';
import 'core/state/driver_alert_sound_preference.dart';
import 'core/state/driver_language_preference.dart';
import 'core/tokens/driver_tokens.dart';

class NotificationSettingsPage extends StatefulWidget {
  const NotificationSettingsPage({super.key});

  @override
  State<NotificationSettingsPage> createState() =>
      _NotificationSettingsPageState();
}

class _NotificationSettingsPageState extends State<NotificationSettingsPage> {
  final _api = DriverApiClient.instance;
  final _newOrderAlert = NewOrderAlert();
  bool _loading = true;
  bool _saving = false;
  bool _testingSound = false;
  String? _error;
  String? _soundTestMessage;
  bool _pushEnabled = true;
  bool _orderEnabled = true;
  bool _settlementEnabled = true;
  bool _systemEnabled = true;
  bool _soundEnabled = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final values = await _api.notificationPreferences();
      if (!mounted) return;
      setState(() {
        _pushEnabled = values['notificationsOn'] != false;
        _orderEnabled = values['orderOn'] != false;
        _settlementEnabled = values['settlementOn'] != false;
        _systemEnabled = values['systemOn'] != false;
        _soundEnabled = values['soundOn'] != false;
        DriverAlertSoundPreference.instance.setEnabled(_soundEnabled);
        _loading = false;
      });
    } on DriverApiException catch (error) {
      if (!mounted) return;
      setState(() {
        _error = error.message;
        _loading = false;
      });
    }
  }

  @override
  void dispose() {
    _newOrderAlert.dispose();
    super.dispose();
  }

  Future<void> _testSound() async {
    if (_testingSound || !_soundEnabled) return;
    setState(() {
      _testingSound = true;
      _soundTestMessage = null;
    });
    final played = await _newOrderAlert.unlock();
    if (!mounted) return;
    setState(() {
      _testingSound = false;
      _soundTestMessage = played
          ? driverText('提示聲已播放', '提示音已播放', 'Alert sound played')
          : driverText('無法播放，請檢查瀏覽器及裝置音訊設定', '无法播放，请检查浏览器及设备音频设置',
              'Unable to play. Check browser and device audio settings.');
    });
  }

  Future<void> _setSoundEnabled(bool value) async {
    bool? activated;
    if (value) activated = await _newOrderAlert.unlock();
    if (!mounted) return;
    if (activated == false) {
      setState(() {
        _soundTestMessage = driverText(
            '提示聲已開啟，但瀏覽器尚未允許播放；請使用測試按鈕重試',
            '提示音已开启，但浏览器尚未允许播放；请使用测试按钮重试',
            'Sound is on, but the browser has not allowed playback. Use the test button to retry.');
      });
    } else if (!value) {
      setState(() => _soundTestMessage = null);
    }
    await _setValue(() => _soundEnabled = value);
  }

  Future<void> _setValue(void Function() update) async {
    if (_saving) return;
    final previous = [
      _pushEnabled,
      _orderEnabled,
      _settlementEnabled,
      _systemEnabled,
      _soundEnabled,
    ];
    setState(() {
      update();
      _saving = true;
      _error = null;
    });
    try {
      await _api.updateNotificationPreferences({
        'notificationsOn': _pushEnabled,
        'orderOn': _orderEnabled,
        'settlementOn': _settlementEnabled,
        'systemOn': _systemEnabled,
        'soundOn': _soundEnabled,
      });
      DriverAlertSoundPreference.instance.setEnabled(_soundEnabled);
      if (!mounted) return;
      setState(() => _saving = false);
    } on DriverApiException catch (error) {
      if (!mounted) return;
      setState(() {
        _pushEnabled = previous[0];
        _orderEnabled = previous[1];
        _settlementEnabled = previous[2];
        _systemEnabled = previous[3];
        _soundEnabled = previous[4];
        _saving = false;
        _error = error.message;
      });
    }
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
          _SettingsHeader(
              title: driverText('通知設定', '通知设置', 'Notification settings')),
          const SizedBox(height: DriverSpacing.xl),
          Text(driverText('通知偏好', '通知偏好', 'Notification preferences'),
              style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                  color: DriverColors.text)),
          const SizedBox(height: DriverSpacing.sm),
          if (_loading)
            const Center(child: CircularProgressIndicator())
          else ...[
            if (_error != null) ...[
              Text(_error!,
                  style: const TextStyle(color: DriverColors.warningText)),
              const SizedBox(height: DriverSpacing.sm),
            ],
            _SettingsCard(children: [
              _ToggleRow(
                  title: driverText('推送通知', '推送通知', 'Notifications'),
                  detail: driverText('接收司機端重要通知', '接收司机端重要通知',
                      'Receive important driver updates'),
                  value: _pushEnabled,
                  onChanged: _saving
                      ? null
                      : (value) => _setValue(() => _pushEnabled = value)),
              _ToggleRow(
                  title:
                      driverText('新訂單通知', '新订单通知', 'New order notifications'),
                  detail: driverText('有可接訂單時通知我', '有可接订单时通知我',
                      'Notify me about available orders'),
                  value: _orderEnabled,
                  onChanged: _saving
                      ? null
                      : (value) => _setValue(() => _orderEnabled = value)),
              _ToggleRow(
                  title:
                      driverText('新訂單提示聲', '新订单提示音', 'New order alert sound'),
                  detail: driverText('有新可接訂單時播放提示聲', '有新可接订单时播放提示音',
                      'Play a sound for new available orders'),
                  value: _soundEnabled,
                  onChanged: _saving ? null : _setSoundEnabled),
              _SoundTestRow(
                enabled: _soundEnabled && !_saving && !_testingSound,
                testing: _testingSound,
                message: _soundTestMessage,
                onPressed: _testSound,
              ),
              _ToggleRow(
                  title: driverText('結算通知', '结算通知', 'Settlement notifications'),
                  detail: driverText('結算完成或狀態更新時通知我', '结算完成或状态更新时通知我',
                      'Notify me about settlement updates'),
                  value: _settlementEnabled,
                  onChanged: _saving
                      ? null
                      : (value) => _setValue(() => _settlementEnabled = value)),
              _ToggleRow(
                  title: driverText('系統通知', '系统通知', 'System notifications'),
                  detail: driverText('服務公告及帳戶安全提醒', '服务公告及账户安全提醒',
                      'Service and account security updates'),
                  value: _systemEnabled,
                  onChanged: _saving
                      ? null
                      : (value) => _setValue(() => _systemEnabled = value)),
            ]),
          ],
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

class _SoundTestRow extends StatelessWidget {
  const _SoundTestRow({
    required this.enabled,
    required this.testing,
    required this.message,
    required this.onPressed,
  });

  final bool enabled;
  final bool testing;
  final String? message;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.symmetric(
            horizontal: DriverSpacing.lg, vertical: DriverSpacing.md),
        child:
            Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          OutlinedButton.icon(
            onPressed: enabled ? onPressed : null,
            icon: const Icon(Icons.volume_up_outlined),
            label: Text(testing
                ? driverText('播放中…', '播放中…', 'Playing…')
                : driverText('測試提示聲', '测试提示音', 'Test alert sound')),
          ),
          if (message != null) ...[
            const SizedBox(height: DriverSpacing.sm),
            Text(message!,
                style: const TextStyle(
                    fontSize: DriverTypography.caption,
                    color: DriverColors.secondaryText)),
          ],
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
  final ValueChanged<bool>? onChanged;

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
                const SizedBox(height: DriverSpacing.xs),
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
