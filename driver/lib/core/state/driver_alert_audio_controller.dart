import 'package:flutter/foundation.dart';

import '../platform/new_order_alert.dart';
import 'driver_alert_sound_preference.dart';

enum DriverAlertAudioState {
  disabled,
  requiresGesture,
  ready,
  failed,
}

class DriverAlertAudioController extends ChangeNotifier {
  DriverAlertAudioController._(this._alert)
      : _state = DriverAlertSoundPreference.instance.enabled
            ? DriverAlertAudioState.requiresGesture
            : DriverAlertAudioState.disabled;

  static final instance = DriverAlertAudioController._(NewOrderAlert());

  final NewOrderAlert _alert;
  DriverAlertAudioState _state;
  bool _sessionActive = false;
  bool _enabled = DriverAlertSoundPreference.instance.enabled;

  factory DriverAlertAudioController.withAlert(NewOrderAlert alert) =
      DriverAlertAudioController._;

  DriverAlertAudioState get state => _state;
  bool get sessionActive => _sessionActive;
  bool get enabled => _enabled;
  bool get requiresActivation =>
      _sessionActive && enabled && _state != DriverAlertAudioState.ready;

  void setSessionActive(bool active) {
    if (_sessionActive == active) return;
    _sessionActive = active;
    notifyListeners();
  }

  void setEnabled(bool enabled) {
    final changed = _enabled != enabled;
    _enabled = enabled;
    DriverAlertSoundPreference.instance.setEnabled(enabled);
    if (!enabled) {
      _setState(DriverAlertAudioState.disabled);
    } else if (changed || _state == DriverAlertAudioState.disabled) {
      _setState(DriverAlertAudioState.requiresGesture);
    }
  }

  Future<bool> activate() async {
    if (!enabled) return false;
    final played = await _alert.unlock();
    _setState(
        played ? DriverAlertAudioState.ready : DriverAlertAudioState.failed);
    return played;
  }

  Future<bool> playNewOrderAlert() async {
    if (!enabled) {
      _setState(DriverAlertAudioState.disabled);
      return false;
    }
    if (_state != DriverAlertAudioState.ready) return false;
    final played = await _alert.play();
    if (!played) _setState(DriverAlertAudioState.requiresGesture);
    return played;
  }

  void _setState(DriverAlertAudioState next) {
    if (_state == next) return;
    _state = next;
    notifyListeners();
  }
}
