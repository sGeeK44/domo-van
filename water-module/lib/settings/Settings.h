#pragma once
#include <WString.h>

class Settings {
public:
  virtual String getDeviceName() = 0;
  virtual void setDeviceName(String newName) = 0;
  virtual uint32_t getPinCode() = 0;
  virtual void setPinCode(uint32_t newPin) = 0;
};