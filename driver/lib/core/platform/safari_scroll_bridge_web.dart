// ignore_for_file: avoid_web_libraries_in_flutter, deprecated_member_use

import 'dart:async';
import 'dart:html' as html;
import 'dart:js' as js;

import 'safari_scroll_bridge_stub.dart';

class SafariScrollBridge {
  const SafariScrollBridge();

  bool get isEnabled =>
      html.document.documentElement?.classes.contains('safari-scroll') ?? false;

  double get currentOffset => html.window.scrollY.toDouble();

  StreamSubscription<html.Event>? listen(SafariScrollCallback onScroll) {
    if (!isEnabled) {
      return null;
    }
    return html.window.onScroll.listen((_) {
      onScroll(html.window.scrollY.toDouble());
    });
  }

  void syncExtent(double maxOffset) {
    if (!isEnabled) {
      return;
    }
    js.context.callMethod('updateSafariScrollExtent', <Object>[maxOffset]);
  }
}
