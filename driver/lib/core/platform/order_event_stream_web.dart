// ignore_for_file: avoid_web_libraries_in_flutter, deprecated_member_use

import 'dart:html' as html;

abstract class OrderEventConnection {
  void close();
}

OrderEventConnection connectOrderEvents(
  String url,
  void Function() onChanged,
  void Function() onError,
) {
  final source = html.EventSource(url);
  source.onMessage.listen((_) => onChanged());
  source.onError.listen((_) => onError());
  return _WebOrderEventConnection(source);
}

class _WebOrderEventConnection implements OrderEventConnection {
  _WebOrderEventConnection(this._source);
  final html.EventSource _source;

  @override
  void close() => _source.close();
}
