// ignore_for_file: avoid_web_libraries_in_flutter, deprecated_member_use

import 'dart:html' as html;
import 'dart:js_interop';

import 'package:web/web.dart' as web_audio;

import 'driver_alert_tone.dart';
import '../state/driver_alert_sound_preference.dart';

abstract class NewOrderAlert {
  factory NewOrderAlert() = WebNewOrderAlert;

  Future<bool> unlock();
  Future<bool> play();
  void dispose();
}

class WebNewOrderAlert implements NewOrderAlert {
  static final html.AudioElement _audio = html.AudioElement()..preload = 'auto';
  static final Map<DriverAlertTone, String> _sources = {};
  static web_audio.AudioContext? _audioContext;
  static bool _unlocked = false;
  static Future<bool>? _playback;

  @override
  Future<bool> unlock() => _startPlayback(requireUnlocked: false);

  @override
  Future<bool> play() => _startPlayback(requireUnlocked: true);

  Future<bool> _startPlayback({required bool requireUnlocked}) {
    if (requireUnlocked && !_unlocked) return Future.value(false);
    return _playback ??= _playTone().whenComplete(() => _playback = null);
  }

  Future<bool> _playTone() async {
    final tone = DriverAlertSoundPreference.instance.tone;
    try {
      if (await _unlockAudioContext()) {
        _unlocked = true;
        _playWebAudioTone(tone);
        await Future<void>.delayed(
            Duration(milliseconds: (tone.duration * 1000).round()));
        return true;
      }
      _audio
        ..src = _sources.putIfAbsent(tone, () => driverAlertToneDataUri(tone))
        ..loop = false
        ..volume = tone == DriverAlertTone.original ? 0.22 : 1
        ..currentTime = 0;
      await _audio.play();
      _unlocked = true;
      await Future<void>.delayed(
          Duration(milliseconds: (tone.duration * 1000).round()));
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

  void _playWebAudioTone(DriverAlertTone tone) {
    final context = _audioContext!;
    final start = context.currentTime;
    for (var index = 0; index < tone.frequencies.length; index++) {
      final noteStart = start + tone.noteStart(index);
      final noteEnd = start + tone.noteEnd(index);
      final gain = context.createGain();
      if (tone != DriverAlertTone.original) {
        gain.gain
          ..setValueAtTime(0, noteStart)
          ..linearRampToValueAtTime(
              tone.gain, noteStart + DriverAlertTone.attackSeconds)
          ..setValueAtTime(tone.gain, noteEnd - DriverAlertTone.releaseSeconds)
          ..linearRampToValueAtTime(0, noteEnd);
      }
      if (tone == DriverAlertTone.original) {
        gain.gain
          ..setValueAtTime(0.0001, start)
          ..exponentialRampToValueAtTime(0.22, start + 0.02)
          ..exponentialRampToValueAtTime(0.0001, start + 0.55);
      }
      gain.connect(context.destination);
      final oscillator = context.createOscillator();
      oscillator.frequency.value = tone.frequencies[index];
      oscillator.connect(gain);
      oscillator.onended = ((web_audio.Event event) {
        oscillator.disconnect();
        gain.disconnect();
      }).toJS;
      oscillator.start(noteStart);
      oscillator.stop(noteEnd);
    }
  }

  @override
  void dispose() {}
}
