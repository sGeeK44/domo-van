#pragma once

#include "TankSettings.h"
#include <string>

// RX commands:
// - "CFG?"                     -> responds "CFG:V=<liters>;H=<mm>"
// - "CFG:V=<liters>;H=<mm>"    -> persists + responds "OK" or "ERR_*"
// Any other input -> "ERR_UNKNOWN_CMD"
class TankCfgProtocol {
  TankSettings *_tankSettings;

  static std::string extractValue(const std::string &cmd, const char *key);

public:
  explicit TankCfgProtocol(TankSettings *tankSettings);
  std::string handle(std::string rx);
};

