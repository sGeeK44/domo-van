#include "EmaFilter.h"
#include <algorithm>

EmaFilter::EmaFilter(float alpha) : _alpha(alpha), _lastValue(0) {}

int EmaFilter::apply(int newValue) {
  if (_lastValue == 0) {
    _lastValue = newValue;
  } else {
    float result = (_alpha * newValue) + ((1.0 - _alpha) * _lastValue);
    // Add 0.5 to round to the nearest integer
    _lastValue = (int)(result + 0.5);
  }
  return _lastValue;
}