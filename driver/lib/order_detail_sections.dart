part of 'order_detail_page.dart';

class _OrderDetailError extends StatelessWidget {
  const _OrderDetailError({required this.message, required this.onRetry});
  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 80),
        child: Column(children: [
          Text(message,
              textAlign: TextAlign.center,
              style: const TextStyle(color: DriverColors.secondaryText)),
          const SizedBox(height: DriverSpacing.md),
          OutlinedButton(onPressed: onRetry, child: const Text('重新載入')),
        ]),
      );
}

class _MapPreview extends StatelessWidget {
  const _MapPreview({required this.origin, required this.destination});
  final String origin;
  final String destination;

  @override
  Widget build(BuildContext context) => Container(
        height: 180,
        decoration: BoxDecoration(
            color: DriverColors.text,
            borderRadius: BorderRadius.circular(DriverRadii.card),
            boxShadow: const [
              BoxShadow(
                  color: Color(0x1f38434a),
                  blurRadius: 24,
                  offset: Offset(0, 8))
            ]),
        child: Stack(children: [
          Center(
              child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 56),
            child: Column(mainAxisSize: MainAxisSize.min, children: [
              const Text('地圖路徑預覽',
                  style: TextStyle(
                      fontSize: DriverTypography.label,
                      color: Color(0xb3ffffff))),
              const SizedBox(height: DriverSpacing.sm),
              Text('$origin → $destination',
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                      fontSize: DriverTypography.bodyLarge,
                      fontWeight: FontWeight.w700,
                      color: DriverColors.surface))
            ]),
          )),
          Positioned(
              top: DriverSpacing.lg,
              left: DriverSpacing.lg,
              child: _MapLabel('起點')),
          Positioned(
              top: DriverSpacing.lg,
              right: DriverSpacing.lg,
              child: _MapLabel('終點')),
        ]),
      );
}

class _MapLabel extends StatelessWidget {
  const _MapLabel(this.label);
  final String label;
  @override
  Widget build(BuildContext context) => Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
          color: const Color(0x1affffff),
          borderRadius: BorderRadius.circular(DriverRadii.pill)),
      child: Text(label,
          style: const TextStyle(
              fontSize: DriverTypography.caption,
              color: DriverColors.surface)));
}

class _OrderInfoCard extends StatefulWidget {
  const _OrderInfoCard({
    required this.passenger,
    required this.routeOrigin,
    required this.routeDestination,
    required this.origin,
    required this.destination,
    required this.scheduledAt,
    required this.price,
  });
  final String passenger;
  final String routeOrigin;
  final String routeDestination;
  final String origin;
  final String destination;
  final String scheduledAt;
  final String price;

  @override
  State<_OrderInfoCard> createState() => _OrderInfoCardState();
}

class _OrderInfoCardState extends State<_OrderInfoCard> {
  bool _expanded = false;

  bool _exceedsTwoLines(String value, double width, TextStyle style) {
    final painter = TextPainter(
      text: TextSpan(text: value, style: style),
      maxLines: 2,
      textDirection: TextDirection.ltr,
    )..layout(maxWidth: width);
    return painter.didExceedMaxLines;
  }

  @override
  Widget build(BuildContext context) => LayoutBuilder(
        builder: (context, constraints) {
          const valueStyle = TextStyle(
              fontSize: DriverTypography.body, color: DriverColors.text);
          final hasOverflow = _exceedsTwoLines(
                  widget.origin, constraints.maxWidth, valueStyle) ||
              _exceedsTwoLines(
                  widget.destination, constraints.maxWidth, valueStyle);

          return Container(
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
            child:
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: 56,
                    height: 56,
                    decoration: BoxDecoration(
                        color: DriverColors.background,
                        borderRadius: BorderRadius.circular(DriverRadii.input)),
                  ),
                  const SizedBox(width: DriverSpacing.md),
                  Expanded(
                    child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(widget.passenger,
                              style: const TextStyle(
                                  fontSize: DriverTypography.bodyLarge,
                                  fontWeight: FontWeight.w700,
                                  color: DriverColors.text)),
                          const SizedBox(height: DriverSpacing.xs),
                          Text(
                              '${widget.routeOrigin} → ${widget.routeDestination}',
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                  fontSize: DriverTypography.label,
                                  color: Color(0xff57667d))),
                          const SizedBox(height: DriverSpacing.xs),
                          Text(widget.scheduledAt,
                              style: const TextStyle(
                                  fontSize: DriverTypography.label,
                                  color: DriverColors.secondaryText))
                        ]),
                  ),
                ],
              ),
              const SizedBox(height: DriverSpacing.md),
              _AddressRow(
                asset: 'assets/order-detail-origin.svg',
                label: widget.origin,
                expanded: _expanded,
              ),
              const SizedBox(height: DriverSpacing.md),
              _AddressRow(
                asset: 'assets/order-detail-destination.svg',
                label: widget.destination,
                expanded: _expanded,
              ),
              if (hasOverflow) ...[
                const SizedBox(height: DriverSpacing.sm),
                Align(
                  alignment: Alignment.centerLeft,
                  child: TextButton(
                    onPressed: () => setState(() => _expanded = !_expanded),
                    child: Text(_expanded ? '收起地址' : '查看完整地址'),
                  ),
                ),
              ],
              const SizedBox(height: DriverSpacing.md),
              Row(crossAxisAlignment: CrossAxisAlignment.center, children: [
                Expanded(
                    child: Text('出發時間  ${widget.scheduledAt}',
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                            fontSize: DriverTypography.label,
                            color: DriverColors.secondaryText))),
                const SizedBox(width: DriverSpacing.md),
                Text(widget.price,
                    style: const TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.w700,
                        color: DriverColors.success))
              ]),
            ]),
          );
        },
      );
}

class _AddressRow extends StatelessWidget {
  const _AddressRow({
    required this.asset,
    required this.label,
    required this.expanded,
  });
  final String asset;
  final String label;
  final bool expanded;
  @override
  Widget build(BuildContext context) => Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.only(top: 7),
            child: SvgPicture.asset(asset, width: 8, height: 8),
          ),
          const SizedBox(width: DriverSpacing.sm),
          Expanded(
            child: Text(
              label,
              maxLines: expanded ? null : 2,
              overflow: expanded ? TextOverflow.visible : TextOverflow.ellipsis,
              style: const TextStyle(
                fontSize: DriverTypography.body,
                color: DriverColors.text,
              ),
            ),
          ),
        ],
      );
}

class _VehicleCard extends StatelessWidget {
  const _VehicleCard(
      {required this.index,
      required this.title,
      required this.ownership,
      required this.type,
      required this.plate,
      required this.selected,
      required this.onTap});
  final int index;
  final String title;
  final String ownership;
  final String type;
  final String plate;
  final bool selected;
  final VoidCallback onTap;
  @override
  Widget build(BuildContext context) => Semantics(
        button: true,
        selected: selected,
        label: '$title $plate',
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(DriverRadii.card),
          child: Container(
            height: 116,
            padding: const EdgeInsets.all(DriverSpacing.md),
            decoration: BoxDecoration(
                color: DriverColors.surface,
                border: Border.all(
                    color: selected
                        ? DriverColors.activeBlue
                        : DriverColors.divider,
                    width: selected ? 2 : 1),
                borderRadius: BorderRadius.circular(DriverRadii.card)),
            child: Stack(children: [
              Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Container(
                    width: 32,
                    height: 32,
                    decoration: BoxDecoration(
                        color: selected
                            ? DriverColors.infoBackground
                            : DriverColors.background,
                        borderRadius: BorderRadius.circular(DriverRadii.card)),
                    alignment: Alignment.center,
                    child: SvgPicture.asset(
                        index == 0
                            ? 'assets/order-detail-car.svg'
                            : 'assets/order-detail-car-mpv.svg',
                        width: 18,
                        height: 18)),
                const SizedBox(width: 10),
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(title,
                      style: const TextStyle(
                          fontSize: DriverTypography.body,
                          fontWeight: FontWeight.w700,
                          color: DriverColors.text)),
                  const SizedBox(height: 2),
                  Text('車輛所屬地：$ownership',
                      style: const TextStyle(
                          fontSize: DriverTypography.caption,
                          color: DriverColors.secondaryText)),
                  const SizedBox(height: 2),
                  Text('車輛類型：$type',
                      style: const TextStyle(
                          fontSize: DriverTypography.caption,
                          color: DriverColors.secondaryText))
                ])
              ]),
              Positioned(
                  left: 0,
                  bottom: 0,
                  child: Text(plate,
                      style: const TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w700,
                          color: DriverColors.text))),
              Positioned(
                  right: 0,
                  bottom: 0,
                  child: Container(
                      width: 20,
                      height: 20,
                      decoration: BoxDecoration(
                          color: selected
                              ? DriverColors.primary
                              : DriverColors.surface,
                          border: selected
                              ? null
                              : Border.all(color: DriverColors.border),
                          borderRadius: BorderRadius.circular(10)),
                      alignment: Alignment.center,
                      child: selected
                          ? SvgPicture.asset('assets/order-detail-check.svg',
                              width: 12, height: 12)
                          : null)),
            ]),
          ),
        ),
      );
}
