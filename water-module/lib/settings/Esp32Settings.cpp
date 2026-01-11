#include "Esp32Settings.h"

String Esp32Settings::getDeviceName() { return get("device_name", "Water Tank"); }

void Esp32Settings::setDeviceName(String newName) { save("device_name", newName.c_str()); }

uint32_t Esp32Settings::getPinCode() { return get("pin_code", 123456); }

void Esp32Settings::setPinCode(uint32_t newPin) { save("pin_code", static_cast<int>(newPin)); }

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