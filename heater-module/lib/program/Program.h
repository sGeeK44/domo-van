#pragma once
#include "BleManager.h"
#include "Logger.h"
#include "Settings.h"
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
};
