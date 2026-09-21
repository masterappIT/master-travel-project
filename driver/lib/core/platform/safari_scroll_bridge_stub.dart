import 'dart:async';

typedef SafariScrollCallback = void Function(double offset);

class SafariScrollBridge {
  const SafariScrollBridge();

  bool get isEnabled => false;

  double get currentOffset => 0;

  StreamSubscription<Object?>? listen(SafariScrollCallback onScroll) => null;

  void syncExtent(double maxOffset) {}
}
