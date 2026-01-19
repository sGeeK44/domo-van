#pragma once

#include "BleListner.h"
#include "Bme280Sensor.h"
#include "TemperatureSensor.h"

class EnvironmentListner : public BleListner {
  Bme280Sensor *_interiorSensor;
  TemperatureSensor *_exteriorSensor;

  void onReceive(std::string value) override;

public:
  EnvironmentListner(const char *name, const char *channelId, Bme280Sensor *interiorSensor,
                     TemperatureSensor *exteriorSensor);
  ~EnvironmentListner() = default;

  // Send current environment data notification
  void notify();
};
