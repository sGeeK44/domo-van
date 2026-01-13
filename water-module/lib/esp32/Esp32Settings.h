#pragma once

#include "Settings.h"
#include <Arduino.h>
#include <Preferences.h>
#include <string>

class Esp32Settings : public Settings {
  const char *_nameSpace;
  Preferences prefs;

public:
  Esp32Settings(const char *nameSpace) : _nameSpace(nameSpace) {}
  int get(const char *key, const int defaultValue);
  void save(const char *key, const int value);
  std::string get(const char *key, const std::string defaultValue);
  void save(const char *key, const char *value);
};