#include "InputSignal.h"

InputSignal::InputSignal(Sensor *sensor) : _sensor(sensor), _lastValidSample(-1) {}

void InputSignal::addFilter(Filter *filter) { _filters.push_back(filter); }

int InputSignal::read() {
  int rawValue = _sensor->read();
  if (rawValue <= 0 || rawValue > _sensor->maxRange()) {
    return _lastValidSample;
  }

  int currentValue = rawValue;
  for (Filter *filter : _filters) {
    currentValue = filter->apply(currentValue);
  }

  _lastValidSample = currentValue;
  return currentValue;
}
