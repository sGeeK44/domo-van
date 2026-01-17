#include "HeaterSettings.h"
#include <string>

int HeaterSettings::getKp() {
  const std::string key = _name + "_kp";
  return _settings->get(key.c_str(), DEFAULT_KP);
}

void HeaterSettings::setKp(int value) {
  const std::string key = _name + "_kp";
  _settings->save(key.c_str(), value);
}

int HeaterSettings::getKi() {
  const std::string key = _name + "_ki";
  return _settings->get(key.c_str(), DEFAULT_KI);
}

void HeaterSettings::setKi(int value) {
  const std::string key = _name + "_ki";
  _settings->save(key.c_str(), value);
}

int HeaterSettings::getKd() {
  const std::string key = _name + "_kd";
  return _settings->get(key.c_str(), DEFAULT_KD);
}

void HeaterSettings::setKd(int value) {
  const std::string key = _name + "_kd";
  _settings->save(key.c_str(), value);
}
