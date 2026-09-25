import 'dart:convert';
import 'dart:typed_data';

import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart';

class OrderInviteApiException implements Exception {
  const OrderInviteApiException(this.statusCode, this.message);

  final int statusCode;
  final String message;
}

class OrderInviteApiClient {
  OrderInviteApiClient({String? baseUrl, http.Client? client})
      : baseUrl = (baseUrl ??
                const String.fromEnvironment('DRIVER_API_BASE_URL',
                    defaultValue: 'http://127.0.0.1:3010'))
            .replaceAll(RegExp(r'/$'), ''),
        _client = client ?? http.Client();

  final String baseUrl;
  final http.Client _client;

  Future<Map<String, dynamic>> details(String token) =>
      _decode(_client.get(Uri.parse(
          '$baseUrl/driver/order-invites/${Uri.encodeComponent(token)}')));

  Future<Map<String, dynamic>> vehicleCatalog() =>
      _decode(_client.get(Uri.parse('$baseUrl/vehicles')));

  Future<Map<String, dynamic>> requestCode(String token,
          {required String countryCode, required String phoneNumber}) =>
      _decode(_client.post(
        Uri.parse(
            '$baseUrl/driver/order-invites/${Uri.encodeComponent(token)}/phone/request'),
        headers: const {'Content-Type': 'application/json'},
        body: jsonEncode(
            {'countryCode': countryCode, 'phoneNumber': phoneNumber}),
      ));

  Future<Map<String, dynamic>> verifyCode(String token,
          {required String challengeId, required String code}) =>
      _decode(_client.post(
        Uri.parse(
            '$baseUrl/driver/order-invites/${Uri.encodeComponent(token)}/phone/verify'),
        headers: const {'Content-Type': 'application/json'},
        body: jsonEncode({'challengeId': challengeId, 'code': code}),
      ));

  Future<Map<String, dynamic>> acceptRegistered(
          String token, String formalSessionToken) =>
      _decode(_client.post(
        Uri.parse(
            '$baseUrl/driver/order-urls/${Uri.encodeComponent(token)}/accept'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $formalSessionToken',
        },
        body: '{}',
      ));

  Future<Map<String, dynamic>> registerAndAccept({
    required String token,
    required Map<String, String> fields,
    required Uint8List vehiclePhotoBytes,
    required String vehiclePhotoFilename,
    required String vehiclePhotoMime,
  }) async {
    final request = http.MultipartRequest(
      'POST',
      Uri.parse(
          '$baseUrl/driver/order-invites/${Uri.encodeComponent(token)}/register-and-accept'),
    )
      ..fields.addAll(fields)
      ..files.add(http.MultipartFile.fromBytes(
        'vehiclePhoto',
        vehiclePhotoBytes,
        filename: vehiclePhotoFilename,
        contentType: MediaType.parse(vehiclePhotoMime),
      ));
    return _decode(http.Response.fromStream(await _client.send(request)));
  }

  Future<Map<String, dynamic>> session(
          String token, String provisionalSessionToken) =>
      _authorizedPostOrGet(token, provisionalSessionToken, 'session', 'GET');

  Future<Map<String, dynamic>> arrive(
          String token, String provisionalSessionToken) =>
      _authorizedPostOrGet(
          token, provisionalSessionToken, 'trip/arrive', 'POST');

  Future<Map<String, dynamic>> start(
          String token, String provisionalSessionToken) =>
      _authorizedPostOrGet(
          token, provisionalSessionToken, 'trip/start', 'POST');

  Future<Map<String, dynamic>> cancel(
          String token, String provisionalSessionToken) =>
      _authorizedPostOrGet(
          token, provisionalSessionToken, 'trip/cancel', 'POST');

  Future<Map<String, dynamic>> complete(
          String token, String provisionalSessionToken) =>
      _authorizedPostOrGet(
          token, provisionalSessionToken, 'trip/complete', 'POST');

  Future<Map<String, dynamic>> submitSettlement(
    String token,
    String provisionalSessionToken, {
    required String settlementMethod,
    required String settlementAccount,
  }) =>
      _authorizedPostOrGet(
          token, provisionalSessionToken, 'trip/settlement', 'POST',
          body: {
            'settlementMethod': settlementMethod,
            'settlementAccount': settlementAccount,
          });

  Future<Map<String, dynamic>> submitFormalReview(
          String token, String provisionalSessionToken) =>
      _authorizedPostOrGet(
          token, provisionalSessionToken, 'formal-review', 'POST');

  Future<Map<String, dynamic>> _authorizedPostOrGet(String token,
      String provisionalSessionToken, String action, String method,
      {Map<String, dynamic>? body}) {
    final uri = Uri.parse(
        '$baseUrl/driver/order-invites/${Uri.encodeComponent(token)}/$action');
    final headers = {
      'Authorization': 'Bearer $provisionalSessionToken',
      if (body != null) 'Content-Type': 'application/json',
    };
    return _decode(method == 'GET'
        ? _client.get(uri, headers: headers)
        : _client.post(uri,
            headers: headers, body: body == null ? null : jsonEncode(body)));
  }

  Future<Map<String, dynamic>> _decode(
      Future<http.Response> responseFuture) async {
    final response = await responseFuture;
    final decoded = response.bodyBytes.isEmpty
        ? <String, dynamic>{}
        : _tryDecode(response.bodyBytes);
    if (response.statusCode < 200 || response.statusCode >= 300) {
      final message = decoded is Map
          ? decoded['message']?.toString() ?? '邀請處理失敗'
          : '邀請處理失敗';
      throw OrderInviteApiException(response.statusCode, message);
    }
    if (decoded is! Map) {
      throw const OrderInviteApiException(502, '伺服器回應格式錯誤');
    }
    return Map<String, dynamic>.from(decoded);
  }

  dynamic _tryDecode(Uint8List bodyBytes) {
    try {
      return jsonDecode(utf8.decode(bodyBytes));
    } on FormatException {
      return null;
    }
  }
}
