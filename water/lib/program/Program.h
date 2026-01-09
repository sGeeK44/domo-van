#pragma once
#include "SensorBase.h"
#include "Settings.h"
#include <Arduino.h>

class Program {
public:
  Program(Settings *settings) : _settings(settings) {}
  void setup(Stream &serial, Stream &serial2);
  void loop();

private:
  Sensor *_sensor;
  class Logger *_logger = nullptr;
  class BleManager *_bleManager = nullptr;
  class InputSignal *_input = nullptr;
  class Settings *_settings = nullptr;
  class BleChannel* _cleanWaterTank;
};
