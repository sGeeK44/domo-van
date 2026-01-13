#pragma once

#include "Settings.h"
#include <Arduino.h>
#include <Preferences.h>
#include <string>

class Esp32Settings : public Settings {
  const char *_nameSpace;
  Preferences prefs;
  int get(const char *key, const int defaultValue);
  void save(const char *key, const int value);
  String get(const char *key, const String defaultValue);
  void save(const char *key, const char *value);

public:
  Esp32Settings(const char *nameSpace) : _nameSpace(nameSpace) {}
  std::string getDeviceName() override;
  void setDeviceName(std::string newName) override;
  uint32_t getPinCode() override;
  void setPinCode(uint32_t newPin) override;

  int getTankVolumeLiters(const char *prefix) override;
  void setTankVolumeLiters(const char *prefix, int liters) override;
  int getTankHeightMm(const char *prefix) override;
  void setTankHeightMm(const char *prefix, int heightMm) override;
};