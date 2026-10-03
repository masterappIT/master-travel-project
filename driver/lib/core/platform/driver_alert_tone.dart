import 'dart:convert';
import 'dart:math' as math;
import 'dart:typed_data';

enum DriverAlertTone {
  original('original', [880, 1174]),
  classic('classic', [880, 1174]),
  chime('chime', [659, 831, 988]),
  bright('bright', [1047, 1319, 1568]);

  const DriverAlertTone(this.id, this.frequencies);

  final String id;
  final List<double> frequencies;
  static const durationSeconds = 2.4;
  static const peakGain = 0.65;
  static const attackSeconds = 0.02;
  static const releaseSeconds = 0.18;

  double get duration => this == original ? 0.55 : durationSeconds;
  double get gain => this == original ? 0.22 : peakGain;
  double get noteDuration => duration / frequencies.length;

  double noteStart(int index) =>
      this == original ? (index == 0 ? 0 : 0.28) : index * noteDuration;

  double noteEnd(int index) => this == original
      ? (index == 0 ? 0.28 : 0.55)
      : (index + 1) * noteDuration;

  static DriverAlertTone fromId(String? id) => values.firstWhere(
        (tone) => tone.id == id,
        orElse: () => classic,
      );
}

Uint8List createDriverAlertWav(DriverAlertTone tone) {
  const sampleRate = 22050;
  final sampleCount = (sampleRate * tone.duration).round();
  final wav = ByteData(44 + sampleCount * 2)
    ..setUint32(0, 0x52494646, Endian.big)
    ..setUint32(4, 36 + sampleCount * 2, Endian.little)
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
    ..setUint32(40, sampleCount * 2, Endian.little);
  for (var index = 0; index < sampleCount; index++) {
    final time = index / sampleRate;
    final note = tone == DriverAlertTone.original
        ? (time < 0.28 ? 0 : 1)
        : (time / tone.noteDuration).floor();
    final localTime = time - tone.noteStart(note);
    final length = tone.noteEnd(note) - tone.noteStart(note);
    final envelope = tone == DriverAlertTone.original
        ? math.sin(math.pi * localTime / length)
        : math.min(
            1.0,
            math.min(localTime / DriverAlertTone.attackSeconds,
                (length - localTime) / DriverAlertTone.releaseSeconds),
          );
    final phaseTime = tone == DriverAlertTone.original ? time : localTime;
    final sample = math.sin(2 * math.pi * tone.frequencies[note] * phaseTime) *
        envelope *
        tone.gain;
    wav.setInt16(44 + index * 2, (sample * 32767).round(), Endian.little);
  }
  return wav.buffer.asUint8List();
}

String driverAlertToneDataUri(DriverAlertTone tone) =>
    'data:audio/wav;base64,${base64Encode(createDriverAlertWav(tone))}';
