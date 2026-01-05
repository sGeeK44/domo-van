#pragma once
#include <stdint.h>

class Filter {
public:
  virtual int apply(int newValue) = 0;
};
