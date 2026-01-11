#include "TankValveListner.h"
#include "Arduino.h"

void TankValveListner::onReceive(std::string value) {
  if (value.length() > 0) {
    if (value == "OPEN") {
      digitalWrite(_relayPin, HIGH);
    } else if (value == "CLOSE") {
      digitalWrite(_relayPin, LOW);
    }
  }
}