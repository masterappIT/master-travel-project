import 'dart:async';

import 'package:flutter/material.dart';

import '../tokens/driver_tokens.dart';

void showDriverNotice(BuildContext context, String message) {
  final overlay = Overlay.of(context, rootOverlay: true);
  late final OverlayEntry entry;
  entry = OverlayEntry(
    builder: (context) => _DriverNotice(
      message: message,
      onDismiss: () {
        if (entry.mounted) entry.remove();
      },
    ),
  );
  overlay.insert(entry);
}

class _DriverNotice extends StatefulWidget {
  const _DriverNotice({required this.message, required this.onDismiss});

  final String message;
  final VoidCallback onDismiss;

  @override
  State<_DriverNotice> createState() => _DriverNoticeState();
}

class _DriverNoticeState extends State<_DriverNotice> {
  late final Timer _timer;

  @override
  void initState() {
    super.initState();
    _timer = Timer(const Duration(seconds: 3), widget.onDismiss);
  }

  @override
  void dispose() {
    _timer.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Positioned.fill(
        child: IgnorePointer(
          child: Center(
            child: Semantics(
              liveRegion: true,
              label: widget.message,
              child: Container(
                constraints: const BoxConstraints(maxWidth: 280),
                margin: const EdgeInsets.all(DriverSpacing.xl),
                padding: const EdgeInsets.symmetric(
                  horizontal: DriverSpacing.xl,
                  vertical: DriverSpacing.lg,
                ),
                decoration: BoxDecoration(
                  color: DriverColors.text,
                  borderRadius: BorderRadius.circular(DriverRadii.card),
                  boxShadow: DriverShadows.floating,
                ),
                child: Text(
                  widget.message,
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    color: DriverColors.onPrimary,
                    fontSize: DriverTypography.bodyLarge,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ),
          ),
        ),
      );
}

Future<T?> showDriverDialog<T>({
  required BuildContext context,
  required WidgetBuilder builder,
  bool barrierDismissible = true,
}) =>
    showGeneralDialog<T>(
      context: context,
      barrierDismissible: barrierDismissible,
      barrierLabel: MaterialLocalizations.of(context).modalBarrierDismissLabel,
      barrierColor: Colors.black54,
      transitionDuration: const Duration(milliseconds: 150),
      pageBuilder: (context, animation, secondaryAnimation) => SafeArea(
        child: Center(child: builder(context)),
      ),
      transitionBuilder: (context, animation, secondaryAnimation, child) =>
          FadeTransition(opacity: animation, child: child),
    );

class DriverDialog extends StatelessWidget {
  const DriverDialog({
    super.key,
    this.title,
    this.content,
    this.actions,
    this.contentPadding = const EdgeInsets.fromLTRB(24, 20, 24, 0),
  });

  final Widget? title;
  final Widget? content;
  final List<Widget>? actions;
  final EdgeInsetsGeometry contentPadding;

  @override
  Widget build(BuildContext context) => Material(
        color: DriverColors.surface,
        borderRadius: BorderRadius.circular(DriverRadii.card),
        clipBehavior: Clip.antiAlias,
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 360),
          child: Padding(
            padding: const EdgeInsets.only(top: DriverSpacing.xl),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                if (title != null)
                  Padding(
                    padding: const EdgeInsets.symmetric(
                        horizontal: DriverSpacing.xl),
                    child: DefaultTextStyle(
                      style: const TextStyle(
                        color: DriverColors.text,
                        fontSize: 20,
                        fontWeight: FontWeight.w700,
                      ),
                      child: title!,
                    ),
                  ),
                if (content != null)
                  Flexible(
                    child: SingleChildScrollView(
                      padding: contentPadding,
                      child: DefaultTextStyle(
                        style: const TextStyle(
                          color: DriverColors.text,
                          fontSize: DriverTypography.bodyLarge,
                        ),
                        child: content!,
                      ),
                    ),
                  ),
                if (actions != null && actions!.isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.all(DriverSpacing.md),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.end,
                      children: actions!
                          .map((action) => Padding(
                                padding: const EdgeInsets.only(
                                    left: DriverSpacing.sm),
                                child: action,
                              ))
                          .toList(),
                    ),
                  ),
              ],
            ),
          ),
        ),
      );
}
