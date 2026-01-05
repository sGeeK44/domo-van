#pragma once
#include "Filter.h"
#include <stdint.h>
#include <vector>

class MedianFilter : public Filter {
public:
  MedianFilter(int windowSize);

  int apply(int newValue) override;

private:
  int _windowSize;
  int _bufferIndex;
  std::vector<int> _dataBuffer;
  std::vector<int> _tempBuffer;
};
