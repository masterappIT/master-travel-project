abstract class NewOrderAlert {
  factory NewOrderAlert() = StubNewOrderAlert;

  Future<void> play();
  void dispose();
}

class StubNewOrderAlert implements NewOrderAlert {
  @override
  Future<void> play() async {}

  @override
  void dispose() {}
}
