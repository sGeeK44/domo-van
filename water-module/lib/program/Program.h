#pragma once
#include "BleManager.h"
#include "Logger.h"
#include "SensorBase.h"
#include "Settings.h"
#include "TankValveListner.h"
#include "WaterTankNotifier.h"
#include <Arduino.h>

class Program {
public:
  Program(Settings *settings) : _settings(settings) {}
  void setup(Stream &serial, Stream &serial1, Stream &serial2, int relayPin);
  void loop();

private:
  unsigned long _startAt;
  Sensor *_sensor = nullptr;
  Logger *_logger = nullptr;
  BleManager *_bleManager = nullptr;
  Settings *_settings = nullptr;
  WaterTankNotifier *_cleanTank = nullptr;
  WaterTankNotifier *_greyTank = nullptr;
  TankValveListner *_greyValve = nullptr;
  WaterTankNotifier *createNotifier(const char *name, const char *channelId, Stream &stream, Logger *logger);
};
