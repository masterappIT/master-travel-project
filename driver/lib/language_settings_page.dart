import 'package:flutter/material.dart';

import 'core/layout/driver_page_shell.dart';
import 'core/state/driver_language_preference.dart';
import 'core/tokens/driver_tokens.dart';

class LanguageSettingsPage extends StatefulWidget {
  const LanguageSettingsPage({super.key});
  @override
  State<LanguageSettingsPage> createState() => _LanguageSettingsPageState();
}

class _LanguageSettingsPageState extends State<LanguageSettingsPage> {
  final _preference = DriverLanguagePreference.instance;

  void _selectLanguage(String value) {
    _preference.select(value);
  }

  @override
  Widget build(BuildContext context) => ValueListenableBuilder<String>(
      valueListenable: _preference,
      builder: (context, language, _) => DriverPageShell(
            showBottomNavigation: false,
            selectedIndex: 2,
            bottomPadding: DriverSpacing.xl,
            child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  _LanguageHeader(),
                  const SizedBox(height: DriverSpacing.xl),
                  Text(driverText('語言', '语言', 'Language'),
                      style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w700,
                          color: DriverColors.text)),
                  const SizedBox(height: DriverSpacing.sm),
                  Material(
                    color: DriverColors.surface,
                    shape: RoundedRectangleBorder(
                        side: const BorderSide(color: DriverColors.divider),
                        borderRadius: BorderRadius.circular(DriverRadii.card)),
                    clipBehavior: Clip.antiAlias,
                    child: RadioGroup<String>(
                      groupValue: language,
                      onChanged: (value) {
                        if (value != null) _selectLanguage(value);
                      },
                      child: Column(children: [
                        for (var i = 0;
                            i < DriverLanguagePreference.languages.length;
                            i++) ...[
                          RadioListTile<String>(
                              title:
                                  Text(DriverLanguagePreference.languages[i]),
                              value: DriverLanguagePreference.languages[i]),
                          if (i < DriverLanguagePreference.languages.length - 1)
                            const Divider(
                                height: 1, color: DriverColors.divider),
                        ]
                      ]),
                    ),
                  ),
                  const SizedBox(height: DriverSpacing.sm),
                  Text(
                      driverText('語言變更會套用至司機端介面。', '语言变更会应用至司机端界面。',
                          'Language changes apply to the driver interface.'),
                      style: TextStyle(
                          fontSize: DriverTypography.caption,
                          color: DriverColors.secondaryText)),
                ]),
          ));
}

class _LanguageHeader extends StatelessWidget {
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
                            color: DriverColors.text))))),
        const SizedBox(width: DriverSpacing.lg),
        Text(driverText('語言設定', '语言设置', 'Language settings'),
            style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.w700,
                color: DriverColors.text)),
      ]);
}
