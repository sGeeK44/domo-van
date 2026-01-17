#pragma once
#include "Logger.h"
#include "TemperatureSensor.h"
#include <DallasTemperature.h>
#include <OneWire.h>

class DS18B20TemperatureSensor : public TemperatureSensor {
public:
  DS18B20TemperatureSensor(uint8_t pin, Logger *logger);

  // Initialize the sensor (must be called before read())
  void begin();

  // Returns the current temperature in degrees Celsius
  // Returns last valid reading if sensor error occurs
  float read() override;

private:
  OneWire _oneWire;
  DallasTemperature _sensors;
  Logger *_logger;
  float _lastValidReading;

  static constexpr float DISCONNECTED_TEMP = -127.0f;
  static constexpr float POWER_ON_RESET_TEMP = 85.0f;
  static constexpr float DEFAULT_TEMP = 20.0f;

  bool isValidReading(float temp);
};
