#pragma once

#include "BleChannel.h"
#include "TankSettings.h"

#include "TankCfgProtocol.h"

class WaterTankListner : public BleListner {
private:
  TankCfgProtocol _protocol;

  void onReceive(std::string value) override {
    const std::string resp = _protocol.handle(value);
    this->send(resp);
  }

public:
  WaterTankListner(const char *name, const char *txUuid, const char *rxUuid, TankSettings *tankSettings)
      : _protocol(TankCfgProtocol(tankSettings)) {
    this->name = name;
    this->txUuid = txUuid;
    this->rxUuid = rxUuid;
  }
};
