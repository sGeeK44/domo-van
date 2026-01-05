#pragma once
#include "Filter.h"
#include <stdint.h>
#include <vector>

class EmaFilter : public Filter {
public:
  EmaFilter(float alpha);

  int apply(int newValue) override;

private:
  int _lastValue;
  float _alpha;
};
