#include "TankValveListner.h"
#include "Arduino.h"

TankValveListner::TankValveListner(const char *name, const char *txUuid, const char *rxUuid, int relayPin,
                                   Settings *settings)
    : _relayPin(relayPin), _settings(new ValveSettings(settings, name)) {
  this->name = name;
  this->txUuid = txUuid;
  this->rxUuid = rxUuid;
  _protocol = new ValveCfgProtocol(this->_settings);
  pinMode(relayPin, OUTPUT);
  digitalWrite(relayPin, LOW);
}

TankValveListner::~TankValveListner() { delete _protocol; }

void TankValveListner::onReceive(std::string value) {
  if (value.empty()) {
    return;
  }

  // Try config protocol first
  std::string response = _protocol->handle(value);
  if (!response.empty()) {
    send(response);
    return;
  }

  // Handle valve commands
  if (value == "OPEN") {
    openValve();
  } else if (value == "CLOSE") {
    closeValve("CLOSED");
  }
}

void TankValveListner::openValve() {
  digitalWrite(_relayPin, HIGH);
  _isOpen = true;
  _remainingSeconds = _settings->getAutoCloseSeconds();
  _lastTickMs = millis();

  // Send initial countdown
  send(std::string("COUNTDOWN:") + std::to_string(_remainingSeconds));
}

void TankValveListner::closeValve(const char *reason) {
  digitalWrite(_relayPin, LOW);
  _isOpen = false;
  _remainingSeconds = 0;
  send(std::string(reason));
}

void TankValveListner::loop() {
  if (!_isOpen || _remainingSeconds <= 0) {
    return;
  }

  unsigned long now = millis();

  // Check if 1 second has passed
  if (now - _lastTickMs >= 1000) {
    _lastTickMs = now;
    _remainingSeconds--;

    if (_remainingSeconds <= 0) {
      // Auto-close
      closeValve("AUTO_CLOSED");
    } else {
      // Send countdown notification
      send(std::string("COUNTDOWN:") + std::to_string(_remainingSeconds));
    }
  }
}
