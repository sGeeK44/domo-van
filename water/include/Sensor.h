#pragma once
#include <stdint.h>

class Sensor {
public:
  virtual int read() = 0;
  virtual int maxRange() = 0;
};
