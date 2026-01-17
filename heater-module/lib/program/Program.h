#pragma once
#include "BleManager.h"
#include "DS18B20TemperatureSensor.h"
#include "HeaterListner.h"
#include "Logger.h"
#include "PwmFan.h"
#include "Settings.h"
#include "TemperatureRegulator.h"
#include <Arduino.h>

class Program {
public:
  Program(Settings *settings) : _settings(settings) {}
  void setup(Stream &serial);
  void loop();

private:
  unsigned long _startAt;
  Logger *_logger = nullptr;
  BleManager *_bleManager = nullptr;
  Settings *_settings = nullptr;

  DS18B20TemperatureSensor *_sensors[4] = {nullptr};
  PwmFan *_fans[4] = {nullptr};
  TemperatureRegulator *_regulators[4] = {nullptr};
  HeaterListner *_heaterListners[4] = {nullptr};
};
