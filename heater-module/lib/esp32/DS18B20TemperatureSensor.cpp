#include "DS18B20TemperatureSensor.h"

DS18B20TemperatureSensor::DS18B20TemperatureSensor(uint8_t pin, Logger *logger)
    : _oneWire(pin), _sensors(&_oneWire), _logger(logger), _lastValidReading(DEFAULT_TEMP) {}

void DS18B20TemperatureSensor::begin() {
  _sensors.begin();
  _sensors.setResolution(12);
  _sensors.setWaitForConversion(true);
  _logger->info("DS18B20 sensor initialized");
}

float DS18B20TemperatureSensor::read() {
  _sensors.requestTemperatures();
  float temp = _sensors.getTempCByIndex(0);

  if (isValidReading(temp)) {
    _lastValidReading = temp;
    _logger->debug("DS18B20 read: %.2f C", temp);
  } else {
    _logger->warn("DS18B20 invalid reading (%.2f), using last valid: %.2f C", temp, _lastValidReading);
  }

  return _lastValidReading;
}

bool DS18B20TemperatureSensor::isValidReading(float temp) {
  // DS18B20 returns -127 when disconnected and 85 on power-on reset
  if (temp == DISCONNECTED_TEMP || temp == POWER_ON_RESET_TEMP) {
    return false;
  }
  // Reasonable temperature range check (-55 to +125 is DS18B20 range)
  return temp >= -55.0f && temp <= 125.0f;
}
