import 'package:flutter/material.dart';

import 'core/layout/driver_page_shell.dart';
import 'core/state/driver_currency_preference.dart';
import 'core/tokens/driver_tokens.dart';

class CurrencyPage extends StatefulWidget {
  const CurrencyPage({super.key});

  @override
  State<CurrencyPage> createState() => _CurrencyPageState();
}

class _CurrencyPageState extends State<CurrencyPage> {
  late String _selectedCurrency;

  @override
  void initState() {
    super.initState();
    _selectedCurrency = DriverCurrencyPreference.instance.code;
  }

  void _save() {
    DriverCurrencyPreference.instance.value = _selectedCurrency;
    Navigator.of(context).pop(_selectedCurrency);
  }

  @override
  Widget build(BuildContext context) {
    return DriverPageShell(
      selectedIndex: 2,
      showBottomNavigation: false,
      bottomPadding: DriverSpacing.xl,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Semantics(
                button: true,
                label: '返回個人資料',
                child: IconButton(
                  tooltip: '返回',
                  onPressed: () => Navigator.of(context).pop(),
                  icon: const Icon(Icons.arrow_back_rounded),
                  color: DriverColors.text,
                ),
              ),
              const Expanded(
                child: Text(
                  '收款貨幣',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: DriverTypography.bodyLarge,
                    fontWeight: FontWeight.w700,
                    color: DriverColors.text,
                  ),
                ),
              ),
              const SizedBox(width: 48),
            ],
          ),
          const SizedBox(height: DriverSpacing.xl),
          const Text(
            '選擇收款貨幣',
            style: TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.w700,
              color: DriverColors.text,
            ),
          ),
          const SizedBox(height: DriverSpacing.sm),
          const Text(
            '選擇後，收款金額會以所選貨幣顯示。',
            style: TextStyle(
              fontSize: DriverTypography.body,
              color: DriverColors.secondaryText,
            ),
          ),
          const SizedBox(height: DriverSpacing.xl),
          _CurrencyOption(
            code: 'HKD',
            name: '港幣',
            symbol: r'$',
            selected: _selectedCurrency == 'HKD',
            onTap: () => setState(() => _selectedCurrency = 'HKD'),
          ),
          const SizedBox(height: DriverSpacing.md),
          _CurrencyOption(
            code: 'CNY',
            name: '人民幣',
            symbol: '¥',
            selected: _selectedCurrency == 'CNY',
            onTap: () => setState(() => _selectedCurrency = 'CNY'),
          ),
          const SizedBox(height: DriverSpacing.xl),
          Container(
            padding: const EdgeInsets.all(DriverSpacing.lg),
            decoration: BoxDecoration(
              color: DriverColors.infoBackground,
              borderRadius: BorderRadius.circular(DriverRadii.input),
            ),
            child: const Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(Icons.info_outline_rounded,
                    size: 20, color: DriverColors.primary),
                SizedBox(width: DriverSpacing.sm),
                Expanded(
                  child: Text(
                    '目前提供港幣及人民幣兩種收款貨幣。貨幣切換只會影響司機端的顯示設定。',
                    style: TextStyle(
                      fontSize: DriverTypography.caption,
                      color: DriverColors.labelText,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: DriverSpacing.xl),
          SizedBox(
            height: 48,
            child: ElevatedButton(
              onPressed: _save,
              style: ElevatedButton.styleFrom(
                backgroundColor: DriverColors.primary,
                foregroundColor: DriverColors.onPrimary,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(DriverRadii.input),
                ),
              ),
              child: const Text(
                '儲存設定',
                style: TextStyle(fontWeight: FontWeight.w700),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _CurrencyOption extends StatelessWidget {
  const _CurrencyOption({
    required this.code,
    required this.name,
    required this.symbol,
    required this.selected,
    required this.onTap,
  });

  final String code;
  final String name;
  final String symbol;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      label: '$name $code',
      selected: selected,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(DriverRadii.card),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 160),
          padding: const EdgeInsets.all(DriverSpacing.lg),
          decoration: BoxDecoration(
            color: DriverColors.surface,
            border: Border.all(
              color: selected ? DriverColors.primary : DriverColors.divider,
              width: selected ? 2 : 1,
            ),
            borderRadius: BorderRadius.circular(DriverRadii.card),
            boxShadow: const [
              BoxShadow(
                color: Color(0x1238434a),
                blurRadius: 4,
                offset: Offset(0, 2),
              ),
            ],
          ),
          child: Row(
            children: [
              Container(
                width: 44,
                height: 44,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: selected
                      ? DriverColors.infoBackground
                      : DriverColors.warningBackground,
                  borderRadius: BorderRadius.circular(DriverRadii.input),
                ),
                child: Text(
                  symbol,
                  style: const TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.w700,
                    color: DriverColors.primary,
                  ),
                ),
              ),
              const SizedBox(width: DriverSpacing.md),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      name,
                      style: const TextStyle(
                        fontSize: DriverTypography.bodyLarge,
                        fontWeight: FontWeight.w700,
                        color: DriverColors.text,
                      ),
                    ),
                    Text(
                      code,
                      style: const TextStyle(
                        fontSize: DriverTypography.caption,
                        color: DriverColors.secondaryText,
                      ),
                    ),
                  ],
                ),
              ),
              Icon(
                selected
                    ? Icons.radio_button_checked_rounded
                    : Icons.radio_button_unchecked_rounded,
                color: selected ? DriverColors.primary : DriverColors.mutedText,
                size: 24,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
