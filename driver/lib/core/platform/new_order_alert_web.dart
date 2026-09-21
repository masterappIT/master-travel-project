// ignore_for_file: avoid_web_libraries_in_flutter, deprecated_member_use

import 'dart:async';
import 'dart:convert';
import 'dart:html' as html;
import 'dart:math' as math;
import 'dart:typed_data';

abstract class NewOrderAlert {
  factory NewOrderAlert() = WebNewOrderAlert;

  Future<void> play();
  void dispose();
}

class WebNewOrderAlert implements NewOrderAlert {
  late final html.AudioElement _audio = html.AudioElement(_createToneDataUri())
    ..preload = 'auto';
  StreamSubscription<html.Event>? _interactionSubscription;

  WebNewOrderAlert() {
    _interactionSubscription = html.document.onClick.take(1).listen((_) {
      unawaited(_unlock());
    });
  }

  Future<void> _unlock() async {
    final volume = _audio.volume;
    try {
      _audio.volume = 0;
      await _audio.play();
      _audio.pause();
      _audio.currentTime = 0;
    } on Object {
      // A later interaction can still permit normal playback.
    } finally {
      _audio.volume = volume;
    }
  }

  @override
  Future<void> play() async {
    try {
      _audio.currentTime = 0;
      await _audio.play();
    } on Object {
      // Browsers may reject playback until the driver interacts with the page.
    }
  }

  @override
  void dispose() {
    _interactionSubscription?.cancel();
    _audio.pause();
    _audio.remove();
  }
}

String _createToneDataUri() {
  const sampleRate = 22050;
  const durationSeconds = 0.55;
  final sampleCount = (sampleRate * durationSeconds).round();
  final pcm = Int16List(sampleCount);
  for (var index = 0; index < sampleCount; index++) {
    final time = index / sampleRate;
    final frequency = time < 0.28 ? 880.0 : 1174.0;
    final localTime = time < 0.28 ? time : time - 0.28;
    final toneDuration = time < 0.28 ? 0.28 : 0.27;
    final envelope = math.sin(math.pi * localTime / toneDuration);
    pcm[index] =
        (math.sin(2 * math.pi * frequency * time) * envelope * 0.22 * 32767)
            .round();
  }

  final byteLength = pcm.lengthInBytes;
  final wav = ByteData(44 + byteLength)
    ..setUint32(0, 0x52494646, Endian.big)
    ..setUint32(4, 36 + byteLength, Endian.little)
    ..setUint32(8, 0x57415645, Endian.big)
    ..setUint32(12, 0x666D7420, Endian.big)
    ..setUint32(16, 16, Endian.little)
    ..setUint16(20, 1, Endian.little)
    ..setUint16(22, 1, Endian.little)
    ..setUint32(24, sampleRate, Endian.little)
    ..setUint32(28, sampleRate * 2, Endian.little)
    ..setUint16(32, 2, Endian.little)
    ..setUint16(34, 16, Endian.little)
    ..setUint32(36, 0x64617461, Endian.big)
    ..setUint32(40, byteLength, Endian.little);
  wav.buffer.asInt16List(44 ~/ 2, pcm.length).setAll(0, pcm);
  return 'data:audio/wav;base64,${base64Encode(wav.buffer.asUint8List())}';
}
