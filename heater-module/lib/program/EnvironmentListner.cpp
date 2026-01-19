#include "EnvironmentListner.h"
#include <string>

EnvironmentListner::EnvironmentListner(const char *name, const char *channelId, Bme280Sensor *interiorSensor,
                                       TemperatureSensor *exteriorSensor)
    : _interiorSensor(interiorSensor), _exteriorSensor(exteriorSensor) {
  this->name = name;
  this->channelId = channelId;
}

void EnvironmentListner::onReceive(std::string value) {
  if (value.empty()) {
    return;
  }

  // Handle ENV? query
  if (value == "ENV?") {
    notify();
    return;
  }

  // Unknown command - no response
}

void EnvironmentListner::notify() {
  float interiorTemp = _interiorSensor->readTemperature();
  float humidity = _interiorSensor->readHumidity();
  float pressure = _interiorSensor->readPressure();
  float exteriorTemp = _exteriorSensor->read();

  // Convert to integers (multiply by 10 for one decimal precision)
  int interiorTempInt = static_cast<int>(interiorTemp * 10);
  int humidityInt = static_cast<int>(humidity * 10);
  int pressureInt = static_cast<int>(pressure * 10);
  int exteriorTempInt = static_cast<int>(exteriorTemp * 10);

  std::string message = "ENV:T=" + std::to_string(interiorTempInt) + ";H=" + std::to_string(humidityInt) + ";P=" +
                        std::to_string(pressureInt) + ";EXT=" + std::to_string(exteriorTempInt);
  send(message);
}
