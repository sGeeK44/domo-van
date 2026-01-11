#pragma once
#include "BleChannel.h"
#include "InputSignal.h"
#include "Logger.h"

class WaterTankNotifier {
  const char *_name;
  BleChannel *_channel;
  InputSignal *_signal;
  Logger *_logger;

public:
  void notify();
  WaterTankNotifier(const char *name, BleChannel *channel, InputSignal *signal, Logger *logger)
      : _name(name), _channel(channel), _signal(signal), _logger(logger) {}
};
