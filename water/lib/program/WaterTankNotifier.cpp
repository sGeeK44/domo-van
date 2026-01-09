#include "WaterTankNotifier.h"

void WaterTankNotifier::notify() {
  int distance = _signal->read();
  if (distance < 0) {
    _logger->debug("%s: Sensor not available yet", _name);
    return;
  } else {
    _logger->debug("%s: Distance: %d mm", _name, distance);
    _channel->sendData(String(distance).c_str());
  }
}