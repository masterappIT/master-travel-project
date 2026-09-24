// ignore_for_file: avoid_web_libraries_in_flutter, deprecated_member_use

import 'dart:convert';
import 'dart:html' as html;
import 'dart:js_interop';
import 'dart:math' as math;
import 'dart:typed_data';

import 'package:web/web.dart' as web_audio;

abstract class NewOrderAlert {
  factory NewOrderAlert() = WebNewOrderAlert;

  Future<bool> unlock();
  Future<bool> play();
  void dispose();
}

class WebNewOrderAlert implements NewOrderAlert {
  static final html.AudioElement _audio =
      html.AudioElement(_createToneDataUri())..preload = 'auto';
  static web_audio.AudioContext? _audioContext;
  static bool _unlocked = false;

  @override
  Future<bool> unlock() async {
    if (await _unlockAudioContext()) {
      _unlocked = true;
      _playWebAudioTone();
      return true;
    }

    try {
      _audio.volume = 0.22;
      _audio.currentTime = 0;
      await _audio.play();
      _unlocked = true;
      return true;
    } on Object {
      _unlocked = false;
      return false;
    }
  }

  @override
  Future<bool> play() async {
    if (!_unlocked) return false;
    if (await _unlockAudioContext()) {
      _playWebAudioTone();
      return true;
    }

    try {
      _audio.currentTime = 0;
      await _audio.play();
      return true;
    } on Object {
      _unlocked = false;
      return false;
    }
  }

  Future<bool> _unlockAudioContext() async {
    try {
      final context = _audioContext ??= web_audio.AudioContext();
      if (context.state != 'running') await context.resume().toDart;
      return context.state == 'running';
    } on Object {
      return false;
    }
  }

  void _playWebAudioTone() {
    final context = _audioContext;
    final destination = context?.destination;
    final start = context?.currentTime;
    if (context == null || destination == null || start == null) return;

    final gain = context.createGain();
    gain.gain
      ..setValueAtTime(0.0001, start)
      ..exponentialRampToValueAtTime(0.22, start + 0.02)
      ..exponentialRampToValueAtTime(0.0001, start + 0.55);
    gain.connect(destination);

    final first = context.createOscillator();
    first.frequency.value = 880;
    first.connect(gain);
    first.start(start);
    first.stop(start + 0.28);

    final second = context.createOscillator();
    second.frequency.value = 1174;
    second.connect(gain);
    second.start(start + 0.28);
    second.stop(start + 0.55);
  }

  @override
  void dispose() {}
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
