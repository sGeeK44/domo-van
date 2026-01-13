#pragma once
#include <cstdint>
#include <string>

class Settings {
public:
  virtual std::string getDeviceName() = 0;
  virtual void setDeviceName(std::string newName) = 0;
  virtual uint32_t getPinCode() = 0;
  virtual void setPinCode(uint32_t newPin) = 0;

  virtual int getTankVolumeLiters(const char *name) = 0;
  virtual void setTankVolumeLiters(const char *name, int liters) = 0;
  virtual int getTankHeightMm(const char *name) = 0;
  virtual void setTankHeightMm(const char *name, int heightMm) = 0;
};