import 'dart:convert';

import 'package:http/http.dart' as http;

class AirportFlight {
  const AirportFlight({
    required this.time,
    required this.flightNumber,
    required this.destination,
    required this.origin,
    required this.baggage,
    required this.hall,
    required this.stand,
    required this.status,
    required this.terminal,
    required this.gate,
  });

  final String time;
  final String flightNumber;
  final String? destination;
  final String? origin;
  final String? baggage;
  final String? hall;
  final String? stand;
  final String status;
  final String terminal;
  final String gate;
}

class AirportFlightClient {
  AirportFlightClient({http.Client? client, String? baseUrl})
      : baseUrl = (baseUrl ??
                const String.fromEnvironment('DRIVER_API_BASE_URL',
                    defaultValue: 'http://127.0.0.1:3010'))
            .replaceAll(RegExp(r'/$'), ''),
        _client = client ?? http.Client();

  final String baseUrl;
  final http.Client _client;

  Future<List<AirportFlight>> fetchDepartures(DateTime date) =>
      _fetch(date, arrival: false);

  Future<List<AirportFlight>> fetchArrivals(DateTime date) =>
      _fetch(date, arrival: true);

  Future<List<AirportFlight>> _fetch(DateTime date,
      {required bool arrival}) async {
    final dateText = '${date.year.toString().padLeft(4, '0')}-'
        '${date.month.toString().padLeft(2, '0')}-'
        '${date.day.toString().padLeft(2, '0')}';
    final uri = Uri.parse('$baseUrl/location/flight-information').replace(
      queryParameters: {
        'date': dateText,
        'arrival': arrival.toString(),
      },
    );
    final response = await _client.get(uri);
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw const AirportFlightException('航班資料暫時無法取得');
    }
    final payload = jsonDecode(response.body);
    if (payload is! List) {
      throw const AirportFlightException('航班資料格式不正確');
    }

    final flights = <AirportFlight>[];
    for (final entry in payload) {
      if (entry is! Map) continue;
      final numbers = <String>[];
      if (entry['flight'] is List) {
        for (final flight in entry['flight'] as List) {
          if (flight is Map && flight['no'] != null) {
            numbers.add(flight['no'].toString());
          }
        }
      }
      final destinations = entry['destination'];
      final origins = entry['origin'];
      flights.add(AirportFlight(
        time: entry['time']?.toString() ?? '--:--',
        flightNumber: numbers.isEmpty ? '航班' : numbers.join(' / '),
        destination: destinations is List ? destinations.join(', ') : null,
        origin: origins is List ? origins.join(', ') : null,
        baggage: entry['baggage']?.toString(),
        hall: entry['hall']?.toString(),
        stand: entry['stand']?.toString(),
        status: entry['status']?.toString() ?? '狀態未提供',
        terminal: entry['terminal']?.toString() ?? '--',
        gate: entry['gate']?.toString() ?? '--',
      ));
    }
    return flights;
  }

  void dispose() => _client.close();
}

class AirportFlightException implements Exception {
  const AirportFlightException(this.message);
  final String message;
  @override
  String toString() => message;
}
