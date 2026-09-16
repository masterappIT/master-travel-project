import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

import 'add_vehicle_page.dart';
import 'app/route_names.dart';
import 'core/api/driver_api_client.dart';
import 'core/layout/driver_page_shell.dart';
import 'core/navigation/driver_navigation.dart';
import 'core/tokens/driver_tokens.dart';

class VehiclePage extends StatefulWidget {
  const VehiclePage({super.key});

  @override
  State<VehiclePage> createState() => _VehiclePageState();
}

class _VehiclePageState extends State<VehiclePage> {
  final _api = DriverApiClient.instance;
  Map<String, dynamic>? _driver;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadVehicle();
  }

  Future<void> _loadVehicle() async {
    try {
      final result = await _api.getVehicleProfile();
      if (!mounted) return;
      setState(() {
        _driver = Map<String, dynamic>.from(
            result['driver'] is Map ? result['driver'] as Map : result);
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

  VehicleFormData _vehicleData() => VehicleFormData(
        ownership: '香港',
        plateType: _driver?['plateType']?.toString() ?? '兩地牌',
        category: _driver?['vehicleCategory']?.toString() ?? '',
        hongKongPlate: _driver?['hkPlate']?.toString() ?? '',
        macauPlate: '',
        mainlandPlate: _driver?['mainlandPlate']?.toString() ?? '',
        color: _driver?['vehicleColor']?.toString() ?? '',
      );

  Future<void> _openVehicleEditor({VehicleFormData? data}) async {
    final updated = await DriverNavigation.push(
      context,
      DriverRouteNames.addVehicle,
      arguments: data,
    );
    if (updated == true && mounted) _loadVehicle();
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const DriverPageShell(
        selectedIndex: 2,
        showBottomNavigation: false,
        child: Center(child: CircularProgressIndicator()),
      );
    }
    if (_error != null) {
      return DriverPageShell(
        selectedIndex: 2,
        showBottomNavigation: false,
        child: Center(child: Text(_error!)),
      );
    }
    final data = _vehicleData();
    return DriverPageShell(
      selectedIndex: 2,
      showBottomNavigation: false,
      bottomPadding: DriverSpacing.xl,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _Header(onBack: () => Navigator.of(context).maybePop()),
          const SizedBox(height: DriverSpacing.lg),
          _VehicleCard(
              data: data,
              title: data.category.isEmpty ? '車輛' : data.category,
              status: '使用中',
              active: true,
              onEdit: () => _openVehicleEditor(data: data)),
          const SizedBox(height: DriverSpacing.lg),
          OutlinedButton(
            onPressed: () => _openVehicleEditor(),
            style: OutlinedButton.styleFrom(
                foregroundColor: DriverColors.activeBlue,
                backgroundColor: DriverColors.surface,
                side: const BorderSide(
                    color: DriverColors.activeBlue, width: 1.5),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(DriverRadii.input)),
                padding:
                    const EdgeInsets.symmetric(vertical: DriverSpacing.lg)),
            child: const Text('+ 新增車輛',
                style: TextStyle(
                    fontSize: DriverTypography.bodyLarge,
                    fontWeight: FontWeight.w700)),
          ),
        ],
      ),
    );
  }
}

class _Header extends StatelessWidget {
  const _Header({required this.onBack});
  final VoidCallback onBack;
  @override
  Widget build(BuildContext context) => Row(children: [
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
                        borderRadius: BorderRadius.circular(18)),
                    child: const Text('‹',
                        style: TextStyle(
                            fontSize: 24,
                            height: 1,
                            fontWeight: FontWeight.w700,
                            color: DriverColors.text))))),
        const SizedBox(width: DriverSpacing.lg),
        const Text('車輛資料',
            style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.w700,
                color: DriverColors.text)),
      ]);
}

class _VehicleCard extends StatelessWidget {
  const _VehicleCard(
      {required this.data,
      required this.title,
      required this.status,
      required this.active,
      required this.onEdit});
  final VehicleFormData data;
  final String title, status;
  final bool active;
  final VoidCallback onEdit;
  @override
  Widget build(BuildContext context) => InkWell(
        onTap: onEdit,
        borderRadius: BorderRadius.circular(DriverRadii.card),
        child: Container(
          padding: const EdgeInsets.all(DriverSpacing.lg),
          decoration: BoxDecoration(
              color: DriverColors.surface,
              border: Border.all(color: DriverColors.divider),
              borderRadius: BorderRadius.circular(DriverRadii.card),
              boxShadow: const [
                BoxShadow(
                    color: Color(0x1238434a),
                    blurRadius: 4,
                    offset: Offset(0, 2))
              ]),
          child: Column(children: [
            Row(children: [
              Container(
                  width: 36,
                  height: 36,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                      color: DriverColors.infoBackground,
                      borderRadius: BorderRadius.circular(18)),
                  child: SvgPicture.asset('assets/vehicle-car-front.svg',
                      width: 20, height: 20)),
              const SizedBox(width: DriverSpacing.sm),
              Expanded(
                  child: Text(title,
                      style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w700,
                          color: DriverColors.text))),
              _StatusPill(label: status, active: active),
            ]),
            const SizedBox(height: DriverSpacing.lg),
            const Divider(height: 1, color: DriverColors.background),
            const SizedBox(height: DriverSpacing.md),
            _InfoRow(label: '香港車牌', value: data.hongKongPlate),
            _InfoRow(label: '內地車牌', value: data.mainlandPlate),
            _InfoRow(label: '車輛顏色', value: data.color),
          ]),
        ),
      );
}

class _StatusPill extends StatelessWidget {
  const _StatusPill({required this.label, required this.active});
  final String label;
  final bool active;
  @override
  Widget build(BuildContext context) => DecoratedBox(
      decoration: BoxDecoration(
          color: active
              ? DriverColors.successBackground
              : DriverColors.warningBackground,
          borderRadius: BorderRadius.circular(DriverRadii.pill)),
      child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
          child: Text(label,
              style: TextStyle(
                  fontSize: DriverTypography.caption,
                  fontWeight: FontWeight.w700,
                  color: active
                      ? DriverColors.primary
                      : DriverColors.secondaryText))));
}

class _InfoRow extends StatelessWidget {
  const _InfoRow({required this.label, required this.value});
  final String label, value;
  @override
  Widget build(BuildContext context) => Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
        Flexible(
            child: Text(label,
                style: const TextStyle(
                    fontSize: DriverTypography.body,
                    color: DriverColors.secondaryText))),
        const SizedBox(width: DriverSpacing.md),
        Flexible(
            child: Text(value,
                textAlign: TextAlign.right,
                style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    color: DriverColors.text)))
      ]));
}
