#include "AdminSettings.h"

std::string AdminSettings::getDeviceName(std::string defaultName) {
  return std::string(_settings->get("device_name", defaultName).c_str());
}

void AdminSettings::setDeviceName(std::string newName) { _settings->save("device_name", newName.c_str()); }

uint32_t AdminSettings::getPinCode() { return _settings->get("pin_code", 123456); }

void AdminSettings::setPinCode(uint32_t newPin) { _settings->save("pin_code", static_cast<int>(newPin)); }