#pragma once

#include <string>

class BleChannel;

class BleListner {
protected:
  BleChannel *_channel = nullptr;

public:
  const char *name;
  const char *txUuid;
  const char *rxUuid;

  void onChannelAttach(BleChannel *channel);
  bool send(const std::string &data);
  virtual void onReceive(std::string value) = 0;
};