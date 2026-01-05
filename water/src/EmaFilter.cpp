#include "EmaFilter.h"
#include <algorithm>

EmaFilter::EmaFilter(float alpha) : _alpha(alpha), _lastValue(0) {}

int EmaFilter::apply(int newValue) {
  if (_lastValue == 0) {
    _lastValue = newValue;
  } else {
    _lastValue = (_alpha * newValue) + ((1.0 - _alpha) * _lastValue);
  }
  return _lastValue;
}