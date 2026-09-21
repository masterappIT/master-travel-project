abstract class OrderEventConnection {
  void close();
}

OrderEventConnection connectOrderEvents(
  String url,
  void Function() onChanged,
  void Function() onError,
) =>
    _StubOrderEventConnection();

class _StubOrderEventConnection implements OrderEventConnection {
  @override
  void close() {}
}
