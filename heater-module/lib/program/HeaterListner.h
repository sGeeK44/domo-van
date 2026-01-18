#pragma once

#include "BleChannel.h"
#include "HeaterCfgProtocol.h"
#include "HeaterSettings.h"
#include "TemperatureRegulator.h"

class HeaterListner : public BleListner {
  TemperatureRegulator *_regulator;
  HeaterSettings *_settings;
  HeaterCfgProtocol *_protocol;

  void onReceive(std::string value) override;

public:
  HeaterListner(const char *name, const char *channelId, TemperatureRegulator *regulator, Settings *settings);
  ~HeaterListner();
  void notify();
};
