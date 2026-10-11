import 'package:driver_web/core/api/driver_api_base_url.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('same-origin API is resolved from the current driver page', () {
    expect(
      driverApiBaseUrl(
        configured: '/api',
        pageUri: Uri.parse(
            'https://driver.example.com/order-invite-app?token=redacted'),
      ),
      'https://driver.example.com/api',
    );
    expect(
      driverApiBaseUrl(
        configured: '/api',
        pageUri: Uri.parse('https://another-driver.example.com/'),
      ),
      'https://another-driver.example.com/api',
    );
  });

  test('explicit API origin remains available for local or staging builds', () {
    expect(
      driverApiBaseUrl(
        configured: 'https://api.example.com',
        pageUri: Uri.parse('https://driver.example.com/'),
      ),
      'https://api.example.com',
    );
  });
}
