#pragma once
#include "SensorBase.h"
#include <Arduino.h>

class Program {
public:
  void setup(Stream &serial, Stream &serial2);
  void loop();

private:
  Sensor *sensor;
  class InputSignal *input = nullptr;
  class Logger *logger = nullptr;
};
