import 'dart:async';

typedef SafariScrollCallback = void Function(double offset);

class SafariScrollBridge {
  const SafariScrollBridge();

  bool get isEnabled => false;

  StreamSubscription<Object?>? listen(SafariScrollCallback onScroll) => null;

  void sync({
    required double offset,
    required double maxOffset,
    required bool shouldScroll,
  }) {}
}
