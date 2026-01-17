#pragma once

#include "HeaterSettings.h"
#include "TemperatureRegulator.h"
#include <string>

// RX commands:
// - "CFG?"                          -> responds "CFG:KP=<kp>;KI=<ki>;KD=<kd>"
// - "CFG:KP=<kp>;KI=<ki>;KD=<kd>"   -> persists + responds "OK" or "ERR_*"
// - "START"                         -> starts regulator + responds "OK"
// - "STOP"                          -> stops regulator + responds "OK"
// - "SP?"                           -> responds "SP:<celsius>"
// - "SP:<celsius>"                  -> sets setpoint + responds "OK" or "ERR_*"
// - "STATUS?"                       -> responds "STATUS:T=<temp>;SP=<sp>;RUN=<0/1>"
// Any other input -> empty string (not handled by this protocol)
class HeaterCfgProtocol {
  HeaterSettings *_heaterSettings;
  TemperatureRegulator *_regulator;

  static std::string extractValue(const std::string &cmd, const char *key);

public:
  HeaterCfgProtocol(HeaterSettings *heaterSettings, TemperatureRegulator *regulator);
  std::string handle(std::string rx);
};
