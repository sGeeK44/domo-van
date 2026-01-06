#pragma once
#include "Filter.h"
#include "Sensor.h"
#include <stdint.h>
#include <vector>

class InputSignal {
public:
  InputSignal(Sensor *sensor);
  void addFilter(Filter *filter);
  int read();

private:
  Sensor *_sensor;
  std::vector<Filter *> _filters;
  int _lastValidSample;
};
