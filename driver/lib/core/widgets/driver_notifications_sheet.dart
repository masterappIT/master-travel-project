import 'package:flutter/material.dart';

import '../api/driver_api_client.dart';
import '../tokens/driver_tokens.dart';
import 'driver_overlays.dart';

Future<void> showDriverNotifications(BuildContext context) async {
  final api = DriverApiClient.instance;
  try {
    final items = await api.notifications();
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
              return ListTile(
                title: Text(notification['title']?.toString() ?? '通知'),
                subtitle: Text(notification['content']?.toString() ?? ''),
                onTap: id == null
                    ? null
                    : () async {
                        try {
                          await api.readNotification(id);
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
