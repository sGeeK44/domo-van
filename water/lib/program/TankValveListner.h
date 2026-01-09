#pragma once

#include "BleChannel.h"

class TankValveListner : public BleListner {
  int _relayPin;
  void onReceive(std::string value) override;

public:
  TankValveListner(const char *name, const char *txUuid, const char *rxUuid, int relayPin) : _relayPin(relayPin) {
    this->name = name;
    this->txUuid = txUuid;
    this->rxUuid = rxUuid;
    pinMode(relayPin, OUTPUT);
    digitalWrite(relayPin, LOW);
  }
};