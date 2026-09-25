import 'package:web/web.dart' as web;

void setOrderInviteSeo(String title) {
  web.document.title = title;
  _setMeta('description', 'MasterApp 司機端邀請接單');
  _setMeta('robots', 'noindex, nofollow, noarchive');
  _setMetaProperty('og:title', title);
  _setMetaProperty('og:description', 'MasterApp 司機端邀請接單');
  _setMetaProperty('og:type', 'website');
  _setMeta('twitter:title', title);
  _setMeta('twitter:description', 'MasterApp 司機端邀請接單');
}

void markOrderInvitePreviewReady() {
  web.document.body?.setAttribute('data-order-invite-preview-ready', 'true');
}

void _setMeta(String name, String content) {
  _findOrCreate('meta[name="$name"]', (element) {
    element.setAttribute('name', name);
    element.setAttribute('content', content);
  });
}

void _setMetaProperty(String property, String content) {
  _findOrCreate('meta[property="$property"]', (element) {
    element.setAttribute('property', property);
    element.setAttribute('content', content);
  });
}

void _findOrCreate(
  String selector,
  void Function(web.HTMLMetaElement) configure,
) {
  final meta = (web.document.querySelector(selector) as web.HTMLMetaElement?) ??
      (web.document.createElement('meta') as web.HTMLMetaElement);
  configure(meta);
  if (!meta.isConnected) web.document.head?.append(meta);
}
