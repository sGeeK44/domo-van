#pragma once

#include "BleChannel.h"

class WaterTankListner : public BleListner {
  void onReceive(std::string value) override {
    // No need to receive data in this application
  }

public:
  WaterTankListner(const char *name, const char *txUuid, const char *rxUuid) {
    this->name = name;
    this->txUuid = txUuid;
    this->rxUuid = rxUuid;
  }
};