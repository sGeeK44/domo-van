#include "Esp32Settings.h"

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

std::string Esp32Settings::get(const char *key, const std::string defaultValue) {
  prefs.begin(_nameSpace, false);
  String result = prefs.getString(key, defaultValue.c_str());
  prefs.end();
  return std::string(result.c_str());
}

void Esp32Settings::save(const char *key, const char *value) {
  prefs.begin(_nameSpace, false);
  prefs.putString(key, value);
  prefs.end();
}
