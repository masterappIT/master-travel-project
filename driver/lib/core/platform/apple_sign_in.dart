import 'apple_sign_in_stub.dart'
    if (dart.library.html) 'apple_sign_in_web.dart';

Future<String?> signInWithApple({
  required String clientId,
  required String redirectUri,
}) =>
    signInWithApplePlatform(
      clientId: clientId,
      redirectUri: redirectUri,
    );
