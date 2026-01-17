#pragma once

#include "AdminSettings.h"
#include <string>

// RX commands:
// - "PIN:<6digits>"      -> persists + responds "OK" or "ERR_*"
// - "NAME:<device_name>" -> persists + responds "OK" or "ERR_*"
// Any other input -> "ERR_UNKNOWN_CMD"
class AdminProtocol {
  AdminSettings *_settings;

public:
  explicit AdminProtocol(AdminSettings *settings);
  std::string handle(std::string rx);
};

