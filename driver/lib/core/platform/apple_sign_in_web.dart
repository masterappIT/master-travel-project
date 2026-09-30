import 'dart:js_interop';

@JS('driverAppleSignIn')
external JSPromise<JSString> _driverAppleSignIn(
    JSString clientId, JSString redirectUri);

Future<String?> signInWithApplePlatform({
  required String clientId,
  required String redirectUri,
}) async =>
    (await _driverAppleSignIn(clientId.toJS, redirectUri.toJS).toDart).toDart;
