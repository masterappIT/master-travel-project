import 'dart:typed_data';

class OrderInviteRecognizedFields {
  const OrderInviteRecognizedFields({
    this.name,
    this.hkPlate,
    this.macauPlate,
    this.mainlandPlate,
    this.vehicleColor,
  });

  final String? name;
  final String? hkPlate;
  final String? macauPlate;
  final String? mainlandPlate;
  final String? vehicleColor;
}

abstract interface class OrderInviteRecognitionAdapter {
  Future<OrderInviteRecognizedFields> recognizeImage(
      Uint8List bytes, String mimeType);
  OrderInviteRecognizedFields recognizeText(String text);
}

class LocalOrderInviteRecognitionAdapter
    implements OrderInviteRecognitionAdapter {
  @override
  Future<OrderInviteRecognizedFields> recognizeImage(
          Uint8List bytes, String mimeType) async =>
      const OrderInviteRecognizedFields();

  @override
  OrderInviteRecognizedFields recognizeText(String text) {
    String? value(RegExp expression) =>
        expression.firstMatch(text)?.group(1)?.trim();
    return OrderInviteRecognizedFields(
      name: value(RegExp(r'(?:姓名|司機姓名)[:：]\s*([^\n]+)')),
      hkPlate: value(RegExp(r'(?:香港車牌|港牌)[:：]\s*([A-Za-z0-9 ]+)')),
      macauPlate: value(RegExp(r'(?:澳門車牌|澳牌)[:：]\s*([A-Za-z0-9 -]+)')),
      mainlandPlate: value(RegExp(r'(?:內地車牌|大陸車牌)[:：]\s*([^\s\n]+)')),
      vehicleColor: value(RegExp(r'(?:車輛顏色|顏色)[:：]\s*([^\n]+)')),
    );
  }
}
