#pragma once

#include "BleChannel.h"
#include "ValveCfgProtocol.h"
#include "ValveSettings.h"

class TankValveListner : public BleListner {
  int _relayPin;
  ValveSettings *_settings;
  ValveCfgProtocol *_protocol;

  // Timer state
  int _remainingSeconds = 0;
  unsigned long _lastTickMs = 0;
  bool _isOpen = false;

  void onReceive(std::string value) override;
  void openValve();
  void closeValve(const char *reason);

public:
  TankValveListner(const char *name, const char *channelId, int relayPin, Settings *settings);
  ~TankValveListner();

  // Call this from main loop to handle countdown
  void loop();
};
