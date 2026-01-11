#pragma once

#include <string>

class BleListner {
public:
  const char *name;
  const char *txUuid;
  const char *rxUuid;
  virtual void onReceive(std::string value) = 0;
};