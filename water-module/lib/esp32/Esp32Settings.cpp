#include "Esp32Settings.h"

std::string Esp32Settings::getDeviceName() { return std::string(get("device_name", "Water Tank").c_str()); }

void Esp32Settings::setDeviceName(std::string newName) { save("device_name", newName.c_str()); }

uint32_t Esp32Settings::getPinCode() { return get("pin_code", 123456); }

void Esp32Settings::setPinCode(uint32_t newPin) { save("pin_code", static_cast<int>(newPin)); }

int Esp32Settings::getTankVolumeLiters(const char *prefix) {
  const String key = String(prefix) + "_v_l";
  return get(key.c_str(), 150);
}

void Esp32Settings::setTankVolumeLiters(const char *prefix, int liters) {
  const String key = String(prefix) + "_v_l";
  save(key.c_str(), liters);
}

int Esp32Settings::getTankHeightMm(const char *prefix) {
  const String key = String(prefix) + "_h_mm";
  return get(key.c_str(), 500);
}

void Esp32Settings::setTankHeightMm(const char *prefix, int heightMm) {
  const String key = String(prefix) + "_h_mm";
  save(key.c_str(), heightMm);
}

int Esp32Settings::get(const char *key, const int defaultValue) {
  prefs.begin(_nameSpace, false);
  int result = prefs.getInt(key, defaultValue);
  prefs.end();
  return result;
}

void Esp32Settings::save(const char *key, const int value) {
  prefs.begin(_nameSpace, false);
  prefs.putInt(key, value);
  prefs.end();
}

String Esp32Settings::get(const char *key, const String defaultValue) {
  prefs.begin(_nameSpace, false);
  String result = prefs.getString(key, defaultValue);
  prefs.end();
  return result;
}

void Esp32Settings::save(const char *key, const char *value) {
  prefs.begin(_nameSpace, false);
  prefs.putString(key, value);
  prefs.end();
}
