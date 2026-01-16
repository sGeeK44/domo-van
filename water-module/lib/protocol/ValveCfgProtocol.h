#pragma once

#include "ValveSettings.h"
#include <string>

// RX commands:
// - "CFG?"                -> responds "CFG:T=<seconds>"
// - "CFG:T=<seconds>"     -> persists + responds "OK" or "ERR_*"
// Any other input -> empty string (not handled by this protocol)
class ValveCfgProtocol {
  ValveSettings *_valveSettings;

  static std::string extractValue(const std::string &cmd, const char *key);

public:
  explicit ValveCfgProtocol(ValveSettings *valveSettings);
  std::string handle(std::string rx);
};
