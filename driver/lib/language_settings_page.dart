import 'dart:html' as html;

import 'package:flutter/material.dart';

import 'core/api/driver_api_client.dart';
import 'core/layout/driver_page_shell.dart';
import 'core/tokens/driver_tokens.dart';

class LanguageSettingsPage extends StatefulWidget {
  const LanguageSettingsPage({super.key});
  @override
  State<LanguageSettingsPage> createState() => _LanguageSettingsPageState();
}

class _LanguageSettingsPageState extends State<LanguageSettingsPage> {
  String _language = '繁體中文';
  static const _storageKey = 'driver_language';
  static const _languages = ['繁體中文', '简体中文', 'English'];

  @override
  void initState() {
    super.initState();
    _language = html.window.localStorage[_storageKey] ?? _language;
    _loadLanguageFromApi();
  }

  Future<void> _loadLanguageFromApi() async {
    try {
      final settings = await DriverApiClient.instance.settings();
      final language = settings['language']?.toString();
      if (!mounted || language == null || !_languages.contains(language))
        return;
      setState(() => _language = language);
      html.window.localStorage[_storageKey] = language;
    } on DriverApiException {
      // Keep the locally saved language when the settings endpoint is unavailable.
    }
  }

  void _selectLanguage(String value) {
    setState(() => _language = value);
    html.window.localStorage[_storageKey] = value;
  }

  @override
  Widget build(BuildContext context) => DriverPageShell(
        showBottomNavigation: false,
        selectedIndex: 2,
        bottomPadding: DriverSpacing.xl,
        child:
            Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          _LanguageHeader(),
          const SizedBox(height: DriverSpacing.xl),
          const Text('語言',
              style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                  color: DriverColors.text)),
          const SizedBox(height: DriverSpacing.sm),
          Container(
            decoration: BoxDecoration(
                color: DriverColors.surface,
                border: Border.all(color: DriverColors.divider),
                borderRadius: BorderRadius.circular(DriverRadii.card)),
            child: Column(children: [
              for (var i = 0; i < _languages.length; i++) ...[
                RadioListTile<String>(
                    title: Text(_languages[i]),
                    value: _languages[i],
                    groupValue: _language,
                    onChanged: (value) {
                      if (value != null) _selectLanguage(value);
                    }),
                if (i < _languages.length - 1)
                  const Divider(height: 1, color: DriverColors.divider),
              ]
            ]),
          ),
          const SizedBox(height: DriverSpacing.sm),
          const Text('語言變更會套用至司機端介面。',
              style: TextStyle(
                  fontSize: DriverTypography.caption,
                  color: DriverColors.secondaryText)),
        ]),
      );
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
        const Text('語言設定',
            style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.w700,
                color: DriverColors.text)),
      ]);
}
