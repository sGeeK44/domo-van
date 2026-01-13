#pragma once
#include <cstdint>
#include <string>

class Settings {
public:
  virtual std::string getDeviceName() = 0;
  virtual void setDeviceName(std::string newName) = 0;
  virtual uint32_t getPinCode() = 0;
  virtual void setPinCode(uint32_t newPin) = 0;
};