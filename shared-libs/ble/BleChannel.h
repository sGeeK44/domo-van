#pragma once

#include "BleConnectionListner.h"
#include "BleListner.h"
#include "Logger.h"
#include <NimBLEDevice.h>

class BleChannel : public NimBLECharacteristicCallbacks {
  const char *HUMAN_READABLE_NAME = "2901";
  NimBLECharacteristic *_txPort = nullptr;
  BleConnectionListner *_connectionListner = nullptr;
  BleListner *_listner = nullptr;
  Logger *_logger = nullptr;

  void onWrite(NimBLECharacteristic *channel) override;

public:
  BleChannel(NimBLEService *service, BleConnectionListner *connectionListner, BleListner *lisner, Logger *logger);
  void sendData(const std::string &data);
};