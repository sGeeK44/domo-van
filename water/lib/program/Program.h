#pragma once
#include "SensorBase.h"
#include <Arduino.h>

class Program {
public:
  Program(Settings *settings) : _settings(settings) {}
  void setup(Stream &serial, Stream &serial2);
  void loop();

private:
  Sensor *sensor;
  class InputSignal *input = nullptr;
  class Logger *logger = nullptr;
  class Settings *_settings = nullptr;
};
