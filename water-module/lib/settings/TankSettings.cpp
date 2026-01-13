#include "TankSettings.h"
#include <string>

int TankSettings::getVolumeLiters() {
  const std::string key = std::string(_name) + "_v_l";
  return _settings->get(key.c_str(), 150);
}
void TankSettings::setVolumeLiters(int liters) {
  const std::string key = std::string(_name) + "_v_l";
  _settings->save(key.c_str(), liters);
}

int TankSettings::getHeightMm() {
  const std::string key = std::string(_name) + "_h_mm";
  return _settings->get(key.c_str(), 500);
}
void TankSettings::setHeightMm(int heightMm) {
  const std::string key = std::string(_name) + "_h_mm";
  _settings->save(key.c_str(), heightMm);
}
