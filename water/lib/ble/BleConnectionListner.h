#pragma once

#include "Logger.h"
#include <NimBLEDevice.h>

class BleConnectionListner : public NimBLEServerCallbacks {
  void onConnect(NimBLEServer *server) override;
  void onDisconnect(NimBLEServer *server) override;
  void onAuthenticationComplete(ble_gap_conn_desc *desc) override;
  Logger *_logger;
  bool _deviceConnected = false;

public:
  BleConnectionListner(Logger *logger) : _logger(logger) {}
  bool isConnected();
};