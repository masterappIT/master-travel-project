import 'package:flutter/material.dart';

import 'core/api/driver_api_client.dart';
import 'core/layout/driver_page_shell.dart';
import 'core/state/driver_currency_preference.dart';
import 'core/tokens/driver_tokens.dart';

class SettlementOverviewPage extends StatefulWidget {
  const SettlementOverviewPage({super.key});

  @override
  State<SettlementOverviewPage> createState() => _SettlementOverviewPageState();
}

class _SettlementOverviewPageState extends State<SettlementOverviewPage> {
  final _api = DriverApiClient.instance;
  bool _loading = true;
  String? _error;
  String _settledAmount = '0';
  String _unsettledAmount = '0';

  @override
  void initState() {
    super.initState();
    _loadStatistics();
  }

  Future<void> _loadStatistics() async {
    try {
      final statistics = await _api.statistics();
      final settlement = statistics['settlement'] is Map
          ? Map<String, dynamic>.from(statistics['settlement'] as Map)
          : <String, dynamic>{};
      if (!mounted) return;
      setState(() {
        _settledAmount = _formatAmount(settlement['settledEarnings']);
        _unsettledAmount = _formatAmount(settlement['unsettledEarnings']);
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

  String _formatAmount(dynamic value) {
    final amount = value is num ? value : num.tryParse(value?.toString() ?? '');
    return amount?.toStringAsFixed(2) ?? '0';
  }

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<String>(
      valueListenable: DriverCurrencyPreference.instance,
      builder: (context, currency, _) => DriverPageShell(
        selectedIndex: 2,
        showBottomNavigation: false,
        bottomPadding: DriverSpacing.xl,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                IconButton(
                  tooltip: '返回',
                  onPressed: () => Navigator.of(context).pop(),
                  icon: const Icon(Icons.arrow_back_rounded),
                  color: DriverColors.text,
                ),
                const Expanded(
                  child: Text(
                    '結算概覽',
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
              '收款結算',
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.w700,
                color: DriverColors.text,
              ),
            ),
            const SizedBox(height: DriverSpacing.sm),
            const Text(
              '查看已結算及待結算的收款紀錄。',
              style: TextStyle(
                fontSize: DriverTypography.body,
                color: DriverColors.secondaryText,
              ),
            ),
            const SizedBox(height: DriverSpacing.xl),
            if (_loading)
              const Center(child: CircularProgressIndicator())
            else if (_error != null)
              Text(_error!,
                  style: const TextStyle(color: DriverColors.warningText)),
            if (!_loading && _error == null) ...[
              _SettlementAmountCard(
                label: '已結算',
                amount: _settledAmount,
                description: '已完成結算的收款金額',
                color: DriverColors.primary,
                background: DriverColors.infoBackground,
              ),
              const SizedBox(height: DriverSpacing.md),
              _SettlementAmountCard(
                label: '未結算',
                amount: _unsettledAmount,
                description: '等待結算的收款金額',
                color: DriverColors.warningText,
                background: DriverColors.warningBackground,
              ),
            ],
            const SizedBox(height: DriverSpacing.xl),
            _SettlementSection(
              title: '結算資訊',
              children: [
                _InfoRow(
                  label: '目前收款貨幣',
                  value:
                      '${DriverCurrencyPreference.instance.code} ${DriverCurrencyPreference.instance.name}',
                ),
                const _InfoRow(label: '結算方式', value: '自動結算'),
                const _InfoRow(label: '下次結算日期', value: '尚未安排'),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _SettlementAmountCard extends StatelessWidget {
  const _SettlementAmountCard({
    required this.label,
    required this.amount,
    required this.description,
    required this.color,
    required this.background,
  });

  final String label;
  final String amount;
  final String description;
  final Color color;
  final Color background;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(DriverSpacing.lg),
        decoration: BoxDecoration(
          color: background,
          borderRadius: BorderRadius.circular(DriverRadii.card),
        ),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(label,
                      style: TextStyle(
                          fontSize: DriverTypography.body,
                          fontWeight: FontWeight.w700,
                          color: color)),
                  const SizedBox(height: DriverSpacing.xs),
                  Text(description,
                      style: const TextStyle(
                          fontSize: DriverTypography.caption,
                          color: DriverColors.secondaryText)),
                ],
              ),
            ),
            Text('${DriverCurrencyPreference.instance.symbol}$amount',
                style: TextStyle(
                    fontSize: 24, fontWeight: FontWeight.w700, color: color)),
          ],
        ),
      );
}

class _SettlementSection extends StatelessWidget {
  const _SettlementSection({required this.title, required this.children});

  final String title;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(DriverSpacing.lg),
        decoration: BoxDecoration(
          color: DriverColors.surface,
          border: Border.all(color: DriverColors.divider),
          borderRadius: BorderRadius.circular(DriverRadii.card),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(title,
                style: const TextStyle(
                    fontSize: DriverTypography.bodyLarge,
                    fontWeight: FontWeight.w700,
                    color: DriverColors.text)),
            const SizedBox(height: DriverSpacing.md),
            ...children,
          ],
        ),
      );
}

class _InfoRow extends StatelessWidget {
  const _InfoRow({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.symmetric(vertical: DriverSpacing.sm),
        child: Row(
          children: [
            Expanded(
              child: Text(label,
                  style: const TextStyle(
                      fontSize: DriverTypography.body,
                      color: DriverColors.secondaryText)),
            ),
            Text(value,
                style: const TextStyle(
                    fontSize: DriverTypography.body,
                    fontWeight: FontWeight.w600,
                    color: DriverColors.text)),
          ],
        ),
      );
}
