#pragma once

#include "AdminSettings.h"
#include <string>

// RX commands:
// - "PIN:<6digits>"      -> persists + responds "OK" or "ERR_*"
// - "NAME:<device_name>" -> persists + responds "OK" or "ERR_*"
// - "ID:NAME=<device_name>;PIN=<6digits>" -> persists both or neither, and
//   responds with a single "OK" or "ERR_*". An OK reboots the module (see
//   AdminListener), so a two-command identity change would lose the second.
// Any other input -> "ERR_UNKNOWN_CMD"
class AdminProtocol {
  AdminSettings *_settings;

  std::string handleIdentity(const std::string &body);

public:
  explicit AdminProtocol(AdminSettings *settings);
  std::string handle(std::string rx);
};
