abstract class NewOrderAlert {
  factory NewOrderAlert() = StubNewOrderAlert;

  Future<bool> unlock();
  Future<bool> play();
  void dispose();
}

class StubNewOrderAlert implements NewOrderAlert {
  Future<bool> unlock() async => true;

  @override
  Future<bool> play() async => true;

  @override
  void dispose() {}
}
