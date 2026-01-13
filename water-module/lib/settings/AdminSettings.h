#pragma once
#include "Settings.h"
#include <cstdint>
#include <string>

class AdminSettings {
  Settings *_settings = nullptr;

public:
  AdminSettings(Settings *settings) : _settings(settings) {}
  std::string getDeviceName();
  void setDeviceName(std::string newName);
  uint32_t getPinCode();
  void setPinCode(uint32_t newPin);
};