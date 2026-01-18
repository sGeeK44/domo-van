#pragma once

#include "BleChannel.h"
#include "Logger.h"
#include "Settings.h"
#include <NimBLEDevice.h>
#include <string>

class BleManager
{
private:
  std::string _serviceId;
  std::string _serviceUuid;
  Logger *_logger = nullptr;
  Settings *_settings = nullptr;
  BleChannel *_adminChannel = nullptr;
  NimBLEService *_service = nullptr;
  BleConnectionListner *_connectionListner = nullptr;

public:
  BleManager(Logger *logger, Settings *settings) : _logger(logger), _settings(settings) {}
  void setup(std::string defaultName, std::string serviceId);
  BleChannel *addChannel(BleListner *listner);
  void start();
  bool isConnected();
};
