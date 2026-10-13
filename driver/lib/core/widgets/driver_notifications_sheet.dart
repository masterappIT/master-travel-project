import 'dart:async';

import 'package:flutter/material.dart';

import '../api/driver_api_client.dart';
import '../state/driver_language_preference.dart';
import '../state/driver_notification_inbox.dart';
import '../tokens/driver_tokens.dart';
import 'driver_overlays.dart';

Future<void> showDriverNotifications(BuildContext context) async {
  final api = DriverApiClient.instance;
  try {
    final items = await DriverNotificationInbox.load();
    if (!context.mounted) return;
    await showModalBottomSheet<void>(
      context: context,
      builder: (context) => SafeArea(
        child: ListView(
          shrinkWrap: true,
          padding: const EdgeInsets.all(DriverSpacing.xl),
          children: [
            const Text('通知',
                style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700)),
            const SizedBox(height: DriverSpacing.md),
            if (items.isEmpty) const Text('目前沒有通知'),
            ...items.map((item) {
              final notification = Map<String, dynamic>.from(item as Map);
              final id = notification['id']?.toString();
              final unread = notification['readAt'] == null;
              return ListTile(
                title: Text(notification['title']?.toString() ?? '通知',
                    style: unread
                        ? const TextStyle(fontWeight: FontWeight.w700)
                        : null),
                subtitle: Text(notification['content']?.toString() ?? ''),
                trailing: unread
                    ? Text(driverText('新', '新', 'New'),
                        style: const TextStyle(
                            fontSize: DriverTypography.caption,
                            fontWeight: FontWeight.w700,
                            color: DriverColors.primary))
                    : null,
                onTap: id == null
                    ? null
                    : () async {
                        try {
                          await api.readNotification(id);
                          unawaited(DriverNotificationInbox.refresh());
                          if (context.mounted) Navigator.of(context).pop();
                        } on DriverApiException catch (error) {
                          if (context.mounted) {
                            showDriverNotice(context, error.message);
                          }
                        }
                      },
              );
            }),
          ],
        ),
      ),
    );
  } on DriverApiException catch (error) {
    if (context.mounted) showDriverNotice(context, error.message);
  }
}
