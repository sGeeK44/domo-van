#include "MedianFilter.h"
#include <algorithm>

MedianFilter::MedianFilter(int windowSize) : _windowSize(windowSize), _bufferIndex(-1) {
  _dataBuffer.resize(_windowSize, 0);
  _tempBuffer.reserve(_windowSize);
}

int MedianFilter::apply(int newValue) {
  if (_bufferIndex == -1) {
    for (int i = 0; i < _windowSize; i++)
      _dataBuffer[i] = newValue;
    _bufferIndex = 0;
    return newValue;
  }

  _dataBuffer[_bufferIndex] = newValue;
  _bufferIndex = (_bufferIndex + 1) % _windowSize;
  _tempBuffer = _dataBuffer;
  std::sort(_tempBuffer.begin(), _tempBuffer.end());
  return _tempBuffer[_windowSize / 2];
}