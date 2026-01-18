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
  WaterTankListner(const char *name, const char *channelId, Settings *settings)
      : _protocol(TankCfgProtocol(new TankSettings(settings, name))) {
    this->name = name;
    this->channelId = channelId;
  }
};
