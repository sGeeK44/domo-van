#include "Bme280Sensor.h"
#include <Wire.h>

Bme280Sensor::Bme280Sensor(Logger *logger, uint8_t address)
    : _logger(logger), _address(address), _available(false),
      _lastTemperature(DEFAULT_TEMP), _lastHumidity(DEFAULT_HUMIDITY),
      _lastPressure(DEFAULT_PRESSURE) {}

bool Bme280Sensor::begin() {
  Wire.begin();

  if (!_bme.begin(_address, &Wire)) {
    _logger->warn("BME280 sensor not found at address 0x%02X", _address);
    _available = false;
    return false;
  }

  // Configure for indoor environment monitoring
  _bme.setSampling(Adafruit_BME280::MODE_NORMAL,
                   Adafruit_BME280::SAMPLING_X2,  // temperature
                   Adafruit_BME280::SAMPLING_X16, // pressure
                   Adafruit_BME280::SAMPLING_X1,  // humidity
                   Adafruit_BME280::FILTER_X16,
                   Adafruit_BME280::STANDBY_MS_500);

  _available = true;
  _logger->info("BME280 sensor initialized at address 0x%02X", _address);
  return true;
}

float Bme280Sensor::readTemperature() {
  if (!_available) {
    return _lastTemperature;
  }

  float temp = _bme.readTemperature();
  if (isnan(temp)) {
    _logger->warn("BME280: Invalid temperature reading");
    return _lastTemperature;
  }

  _lastTemperature = temp;
  return temp;
}

float Bme280Sensor::readHumidity() {
  if (!_available) {
    return _lastHumidity;
  }

  float humidity = _bme.readHumidity();
  if (isnan(humidity)) {
    _logger->warn("BME280: Invalid humidity reading");
    return _lastHumidity;
  }

  _lastHumidity = humidity;
  return humidity;
}

float Bme280Sensor::readPressure() {
  if (!_available) {
    return _lastPressure;
  }

  float pressure = _bme.readPressure() / 100.0f; // Convert Pa to hPa
  if (isnan(pressure)) {
    _logger->warn("BME280: Invalid pressure reading");
    return _lastPressure;
  }

  _lastPressure = pressure;
  return pressure;
}
