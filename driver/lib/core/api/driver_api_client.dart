import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart';

import '../platform/browser_storage.dart';
import '../state/driver_status.dart';

Map<String, dynamic>? selectTripVehicle({
  required bool accepted,
  required bool completed,
  required dynamic snapshot,
  required Map<String, dynamic>? currentVehicle,
}) {
  if (!accepted && !completed) return currentVehicle;
  return snapshot is Map ? Map<String, dynamic>.from(snapshot) : null;
}

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

  static DriverApiClient _instance = DriverApiClient();

  static DriverApiClient get instance => _instance;

  @visibleForTesting
  static set instance(DriverApiClient client) => _instance = client;

  static const _tokenStorageKey = 'driver_session_token';

  final String baseUrl;
  final http.Client _client;
  String? _token;
  Map<String, dynamic>? _currentDriver;

  String? get token => _token;
  Map<String, dynamic>? get currentDriver => _currentDriver;
  bool get isApproved => _currentDriver?['reviewStatus'] == 'APPROVED';

  Future<void> restoreSession() async {
    final storedToken = readBrowserValue(_tokenStorageKey);
    if (storedToken == null || storedToken.isEmpty) return;
    _token = storedToken;
    try {
      await me().timeout(const Duration(seconds: 8));
    } on Object {
      clearSession();
    }
  }

  void clearSession() {
    _token = null;
    _currentDriver = null;
    removeBrowserValue(_tokenStorageKey);
  }

  Map<String, String> get _headers => {
        'Content-Type': 'application/json',
        if (_token != null) 'Authorization': 'Bearer $_token',
      };

  Future<Map<String, dynamic>> requestRegistrationCode(
          {required String countryCode, required String phoneNumber}) async =>
      _decode(await _client.post(
          Uri.parse('$baseUrl/driver/auth/register/phone/request'),
          headers: _headers,
          body: jsonEncode(
              {'countryCode': countryCode, 'phoneNumber': phoneNumber})));

  Future<Map<String, dynamic>> verifyRegistrationCode({
    required String challengeId,
    required String code,
  }) async =>
      _decode(await _client.post(
          Uri.parse('$baseUrl/driver/auth/register/phone/verify'),
          headers: _headers,
          body: jsonEncode({'challengeId': challengeId, 'code': code})));

  Future<DriverSession> registerDriver({
    required String name,
    required String plateType,
    required String vehicleOwnership,
    String? hkPlate,
    String? macauPlate,
    String? mainlandPlate,
    required String phoneCountryCode,
    required String phone,
    required String hongKongMacauCountryCode,
    required String hongKongMacauPhone,
    required String mainlandPhone,
    required String verificationChallengeId,
    required String verificationCode,
    required String vehicleCategory,
    required String vehicleColor,
    required Uint8List vehiclePhotoBytes,
    required String vehiclePhotoFilename,
    required String vehiclePhotoMime,
  }) async {
    final request = http.MultipartRequest(
        'POST', Uri.parse('$baseUrl/driver/auth/register'))
      ..fields.addAll({
        'name': name,
        'plateType': plateType,
        'vehicleOwnership': vehicleOwnership,
        if (hkPlate != null) 'hkPlate': hkPlate,
        if (macauPlate != null) 'macauPlate': macauPlate,
        if (mainlandPlate != null) 'mainlandPlate': mainlandPlate,
        'phoneCountryCode': phoneCountryCode,
        'phone': phone,
        'hongKongMacauCountryCode': hongKongMacauCountryCode,
        'hongKongMacauPhone': hongKongMacauPhone,
        'mainlandPhone': mainlandPhone,
        'challengeId': verificationChallengeId,
        'code': verificationCode,
        'vehicleCategory': vehicleCategory,
        'vehicleColor': vehicleColor,
      })
      ..files.add(http.MultipartFile.fromBytes(
        'vehiclePhoto',
        vehiclePhotoBytes,
        filename: vehiclePhotoFilename,
        contentType: MediaType.parse(vehiclePhotoMime),
      ));
    if (_token != null) request.headers['Authorization'] = 'Bearer $_token';
    final streamedResponse = await _client.send(request);
    final response = await http.Response.fromStream(streamedResponse);
    final session = DriverSession.fromJson(_decode(response));
    _token = session.token;
    _currentDriver = session.driver;
    writeBrowserValue(_tokenStorageKey, session.token);
    return session;
  }

  Future<Map<String, dynamic>> resubmitDriver({
    required String name,
    required String plateType,
    required String vehicleOwnership,
    required String hkPlate,
    required String macauPlate,
    required String mainlandPlate,
    required String vehicleCategory,
    required String vehicleColor,
    Uint8List? vehiclePhotoBytes,
    String? vehiclePhotoFilename,
    String? vehiclePhotoMime,
  }) async {
    final request = http.MultipartRequest(
        'POST', Uri.parse('$baseUrl/driver/auth/resubmit'))
      ..headers['Authorization'] = 'Bearer ${_token ?? ''}'
      ..fields.addAll({
        'name': name,
        'plateType': plateType,
        'vehicleOwnership': vehicleOwnership,
        'hkPlate': hkPlate,
        'macauPlate': macauPlate,
        'mainlandPlate': mainlandPlate,
        'vehicleCategory': vehicleCategory,
        'vehicleColor': vehicleColor,
      });
    request.headers.addAll(_headers);
    if (vehiclePhotoBytes != null) {
      request.files.add(http.MultipartFile.fromBytes(
        'vehiclePhoto',
        vehiclePhotoBytes,
        filename: vehiclePhotoFilename,
        contentType: MediaType.parse(vehiclePhotoMime!),
      ));
    }
    final result =
        _decode(await http.Response.fromStream(await _client.send(request)));
    _currentDriver = result;
    return result;
  }

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
    _token = session.token;
    _currentDriver = session.driver;
    writeBrowserValue(_tokenStorageKey, session.token);
    return session;
  }

  Future<Map<String, dynamic>> me() async {
    final result = _decode(await _client
        .get(Uri.parse('$baseUrl/driver/auth/me'), headers: _headers));
    final driver = result['driver'] is Map ? result['driver'] : result;
    if (driver is Map) {
      _currentDriver = Map<String, dynamic>.from(driver);
      if (driver.containsKey('isOnline')) {
        DriverStatusController.instance.isOnline.value =
            driver['isOnline'] == true;
      }
    }
    return result;
  }

  Future<Map<String, dynamic>> updateStatus(bool isOnline) async {
    final result = _decode(await _client.post(
        Uri.parse('$baseUrl/driver/auth/status'),
        headers: _headers,
        body: jsonEncode({'isOnline': isOnline})));
    DriverStatusController.instance.isOnline.value = isOnline;
    return result;
  }

  Future<Map<String, dynamic>> updateProfile(
          Map<String, dynamic> fields) async =>
      _decode(await _client.patch(Uri.parse('$baseUrl/driver/auth/me'),
          headers: _headers, body: jsonEncode(fields)));

  Future<Map<String, dynamic>> updateWechatPayment({
    required String wechatId,
    Uint8List? qrCodeBytes,
    String fileName = 'wechat-qr-code.jpg',
    String mimeType = 'image/jpeg',
  }) async {
    final request = http.MultipartRequest(
        'POST', Uri.parse('$baseUrl/driver/auth/me/wechat-payment'))
      ..headers.addAll({
        if (_token != null) 'Authorization': 'Bearer $_token',
      })
      ..fields['wechatId'] = wechatId;
    if (qrCodeBytes != null) {
      request.files.add(http.MultipartFile.fromBytes(
          'wechatQrCode', qrCodeBytes,
          filename: fileName, contentType: MediaType.parse(mimeType)));
    }
    return _decode(await http.Response.fromStream(await request.send()));
  }

  Future<Map<String, dynamic>> listDriverVehicles() async =>
      _decode(await _client.get(Uri.parse('$baseUrl/driver/auth/vehicles'),
          headers: _headers));

  Future<Map<String, dynamic>> createVehicle(
    Map<String, dynamic> fields, {
    Uint8List? vehiclePhotoBytes,
    String? vehiclePhotoFilename,
    String? vehiclePhotoMime,
  }) =>
      _saveVehicle(
        'POST',
        Uri.parse('$baseUrl/driver/auth/vehicles'),
        fields,
        vehiclePhotoBytes: vehiclePhotoBytes,
        vehiclePhotoFilename: vehiclePhotoFilename,
        vehiclePhotoMime: vehiclePhotoMime,
      );

  Future<Map<String, dynamic>> updateVehicle(
    String id,
    Map<String, dynamic> fields, {
    Uint8List? vehiclePhotoBytes,
    String? vehiclePhotoFilename,
    String? vehiclePhotoMime,
  }) =>
      _saveVehicle(
        'PATCH',
        Uri.parse('$baseUrl/driver/auth/vehicles/${Uri.encodeComponent(id)}'),
        fields,
        vehiclePhotoBytes: vehiclePhotoBytes,
        vehiclePhotoFilename: vehiclePhotoFilename,
        vehiclePhotoMime: vehiclePhotoMime,
      );

  Future<Map<String, dynamic>> _saveVehicle(
    String method,
    Uri uri,
    Map<String, dynamic> fields, {
    Uint8List? vehiclePhotoBytes,
    String? vehiclePhotoFilename,
    String? vehiclePhotoMime,
  }) async {
    final request = http.MultipartRequest(method, uri)
      ..headers.addAll({
        if (_token != null) 'Authorization': 'Bearer $_token',
      })
      ..fields.addAll({
        for (final entry in fields.entries)
          if (entry.value != null) entry.key: entry.value.toString(),
      });
    if (vehiclePhotoBytes != null) {
      request.files.add(http.MultipartFile.fromBytes(
        'vehiclePhoto',
        vehiclePhotoBytes,
        filename: vehiclePhotoFilename,
        contentType: MediaType.parse(vehiclePhotoMime!),
      ));
    }
    return _decode(await http.Response.fromStream(await _client.send(request)));
  }

  Future<Map<String, dynamic>> setPrimaryVehicle(String id) async =>
      _decode(await _client.post(
          Uri.parse(
              '$baseUrl/driver/auth/vehicles/${Uri.encodeComponent(id)}/primary'),
          headers: _headers));

  Future<Map<String, dynamic>> deleteVehicle(String id) async =>
      _decode(await _client.delete(
          Uri.parse('$baseUrl/driver/auth/vehicles/${Uri.encodeComponent(id)}'),
          headers: _headers));

  Future<Map<String, dynamic>> listVehicleCatalog() async => _decode(
      await _client.get(Uri.parse('$baseUrl/vehicles'), headers: _headers));

  Future<Map<String, dynamic>> settings() async => _decode(
      await _client.get(Uri.parse('$baseUrl/settings'), headers: _headers));

  Future<Map<String, dynamic>> statistics() async => _decode(await _client
      .get(Uri.parse('$baseUrl/driver/auth/statistics'), headers: _headers));

  Future<Map<String, dynamic>> orderEventTicket() async => _decode(
      await _client.post(Uri.parse('$baseUrl/driver/auth/trips/events/ticket'),
          headers: _headers));
  Future<List<dynamic>> availableTrips() async => _decodeList(await _client.get(
      Uri.parse('$baseUrl/driver/auth/trips/available'),
      headers: _headers));
  Future<List<dynamic>> trips() async => _decodeList(await _client
      .get(Uri.parse('$baseUrl/driver/auth/trips'), headers: _headers));
  Future<Map<String, dynamic>> trip(String id) async =>
      _decode(await _client.get(
          Uri.parse('$baseUrl/driver/auth/trips/${Uri.encodeComponent(id)}'),
          headers: _headers));
  Future<Map<String, dynamic>> acceptTrip(String id,
          {String? vehicleId}) async =>
      _decode(await _client.post(
          Uri.parse(
              '$baseUrl/driver/auth/trips/${Uri.encodeComponent(id)}/accept'),
          headers: _headers,
          body: jsonEncode({if (vehicleId != null) 'vehicleId': vehicleId})));
  Future<Map<String, dynamic>> rejectTrip(String id) async =>
      _decode(await _client.post(
          Uri.parse(
              '$baseUrl/driver/auth/trips/${Uri.encodeComponent(id)}/reject'),
          headers: _headers));
  Future<Map<String, dynamic>> arriveTrip(String id) async =>
      _decode(await _client.post(
          Uri.parse(
              '$baseUrl/driver/auth/trips/${Uri.encodeComponent(id)}/arrive'),
          headers: _headers));
  Future<Map<String, dynamic>> cancelTrip(String id) async =>
      _decode(await _client.post(
          Uri.parse(
              '$baseUrl/driver/auth/trips/${Uri.encodeComponent(id)}/cancel'),
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
  Future<Map<String, dynamic>> notificationPreferences() async =>
      _decode(await _client.get(
          Uri.parse('$baseUrl/driver/auth/notification-preferences'),
          headers: _headers));
  Future<Map<String, dynamic>> updateNotificationPreferences(
          Map<String, bool> fields) async =>
      _decode(await _client.patch(
          Uri.parse('$baseUrl/driver/auth/notification-preferences'),
          headers: _headers,
          body: jsonEncode(fields)));
  Future<List<dynamic>> notifications() async => _decodeList(await _client
      .get(Uri.parse('$baseUrl/driver/auth/notifications'), headers: _headers));
  Future<Map<String, dynamic>> readNotification(String id) async =>
      _decode(await _client.post(
          Uri.parse(
              '$baseUrl/driver/auth/notifications/${Uri.encodeComponent(id)}/read'),
          headers: _headers));

  Future<void> logout() async {
    if (_token != null) {
      await _client.post(Uri.parse('$baseUrl/driver/auth/logout'),
          headers: _headers);
    }
    clearSession();
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
