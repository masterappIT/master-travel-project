import '../core/platform/browser_storage.dart';

abstract interface class OrderInviteSessionStore {
  String? read(String invitationId);
  void write(String invitationId, String token);
  void remove(String invitationId);
}

class BrowserOrderInviteSessionStore implements OrderInviteSessionStore {
  static const _prefix = 'driver.orderInvite.session.';

  @override
  String? read(String invitationId) =>
      readBrowserValue('$_prefix$invitationId');

  @override
  void write(String invitationId, String token) {
    writeBrowserValue('$_prefix$invitationId', token);
  }

  @override
  void remove(String invitationId) {
    removeBrowserValue('$_prefix$invitationId');
  }
}
