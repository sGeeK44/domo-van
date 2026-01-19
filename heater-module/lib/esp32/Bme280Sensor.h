#pragma once

#include "Logger.h"
#include <Adafruit_BME280.h>

class Bme280Sensor {
public:
  Bme280Sensor(Logger *logger, uint8_t address = 0x76);

  // Initialize the sensor (must be called before reading)
  bool begin();

  // Returns the current temperature in degrees Celsius
  float readTemperature();

  // Returns the current humidity in percentage (0-100)
  float readHumidity();

  // Returns the current pressure in hPa (hectopascals)
  float readPressure();

  // Check if sensor is available
  bool isAvailable() const { return _available; }

private:
  Adafruit_BME280 _bme;
  Logger *_logger;
  uint8_t _address;
  bool _available;

  float _lastTemperature;
  float _lastHumidity;
  float _lastPressure;

  static constexpr float DEFAULT_TEMP = 20.0f;
  static constexpr float DEFAULT_HUMIDITY = 50.0f;
  static constexpr float DEFAULT_PRESSURE = 1013.25f;
};
