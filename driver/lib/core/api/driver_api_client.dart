import 'dart:convert';

import 'package:http/http.dart' as http;

class DriverApiException implements Exception {
  DriverApiException(this.statusCode, this.message);

  final int statusCode;
  final String message;

  @override
  String toString() => 'DriverApiException($statusCode): $message';
}

class DriverSession {
  const DriverSession(
      {required this.token, required this.expiresAt, required this.driver});

  final String token;
  final DateTime expiresAt;
  final Map<String, dynamic> driver;

  factory DriverSession.fromJson(Map<String, dynamic> json) => DriverSession(
        token: json['token'] as String,
        expiresAt: DateTime.parse(json['expiresAt'] as String),
        driver: Map<String, dynamic>.from(json['driver'] as Map),
      );
}

class DriverApiClient {
  DriverApiClient({String? baseUrl, http.Client? client})
      : baseUrl = (baseUrl ??
                const String.fromEnvironment('DRIVER_API_BASE_URL',
                    defaultValue: 'http://127.0.0.1:3010'))
            .replaceAll(RegExp(r'/$'), ''),
        _client = client ?? http.Client();

  static final DriverApiClient instance = DriverApiClient();

  final String baseUrl;
  final http.Client _client;
  String? token;

  Map<String, String> get _headers => {
        'Content-Type': 'application/json',
        if (token != null) 'Authorization': 'Bearer ' + token!,
      };

  Future<Map<String, dynamic>> requestPhoneCode(
          {required String countryCode, required String phoneNumber}) async =>
      _decode(await _client.post(
          Uri.parse('$baseUrl/driver/auth/phone/request'),
          headers: _headers,
          body: jsonEncode(
              {'countryCode': countryCode, 'phoneNumber': phoneNumber})));

  Future<DriverSession> verifyPhoneCode(
      {required String challengeId, required String code}) async {
    final session = DriverSession.fromJson(_decode(await _client.post(
        Uri.parse('$baseUrl/driver/auth/phone/verify'),
        headers: _headers,
        body: jsonEncode({'challengeId': challengeId, 'code': code}))));
    token = session.token;
    return session;
  }

  Future<Map<String, dynamic>> me() async => _decode(await _client
      .get(Uri.parse('$baseUrl/driver/auth/me'), headers: _headers));
  Future<Map<String, dynamic>> updateStatus(bool isOnline) async =>
      _decode(await _client.post(Uri.parse('$baseUrl/driver/auth/status'),
          headers: _headers, body: jsonEncode({'isOnline': isOnline})));
  Future<Map<String, dynamic>> updateProfile(
          Map<String, dynamic> fields) async =>
      _decode(await _client.patch(Uri.parse('$baseUrl/driver/auth/me'),
          headers: _headers, body: jsonEncode(fields)));
  Future<List<dynamic>> availableTrips() async => _decodeList(await _client.get(
      Uri.parse('$baseUrl/driver/auth/trips/available'),
      headers: _headers));
  Future<List<dynamic>> trips() async => _decodeList(await _client
      .get(Uri.parse('$baseUrl/driver/auth/trips'), headers: _headers));
  Future<Map<String, dynamic>> acceptTrip(String id) async =>
      _decode(await _client.post(
          Uri.parse(
              '$baseUrl/driver/auth/trips/${Uri.encodeComponent(id)}/accept'),
          headers: _headers));
  Future<Map<String, dynamic>> arriveTrip(String id) async =>
      _decode(await _client.post(
          Uri.parse(
              '$baseUrl/driver/auth/trips/${Uri.encodeComponent(id)}/arrive'),
          headers: _headers));
  Future<Map<String, dynamic>> startTrip(String id) async =>
      _decode(await _client.post(
          Uri.parse(
              '$baseUrl/driver/auth/trips/${Uri.encodeComponent(id)}/start'),
          headers: _headers));
  Future<Map<String, dynamic>> completeTrip(String id) async =>
      _decode(await _client.post(
          Uri.parse(
              '$baseUrl/driver/auth/trips/${Uri.encodeComponent(id)}/complete'),
          headers: _headers));
  Future<List<dynamic>> notifications() async => _decodeList(await _client
      .get(Uri.parse('$baseUrl/driver/auth/notifications'), headers: _headers));
  Future<Map<String, dynamic>> readNotification(String id) async =>
      _decode(await _client.post(
          Uri.parse(
              '$baseUrl/driver/auth/notifications/${Uri.encodeComponent(id)}/read'),
          headers: _headers));

  Future<void> logout() async {
    if (token != null)
      await _client.post(Uri.parse('$baseUrl/driver/auth/logout'),
          headers: _headers);
    token = null;
  }

  Map<String, dynamic> _decode(http.Response response) {
    final payload =
        response.body.isEmpty ? <String, dynamic>{} : jsonDecode(response.body);
    if (response.statusCode < 200 || response.statusCode >= 300) {
      final message = payload is Map
          ? payload['message']?.toString() ?? 'Request failed'
          : 'Request failed';
      throw DriverApiException(response.statusCode, message);
    }
    return Map<String, dynamic>.from(payload as Map);
  }

  List<dynamic> _decodeList(http.Response response) {
    if (response.statusCode < 200 || response.statusCode >= 300) {
      final payload = response.body.isEmpty ? null : jsonDecode(response.body);
      final message = payload is Map
          ? payload['message']?.toString() ?? 'Request failed'
          : 'Request failed';
      throw DriverApiException(response.statusCode, message);
    }
    return jsonDecode(response.body) as List<dynamic>;
  }
}
