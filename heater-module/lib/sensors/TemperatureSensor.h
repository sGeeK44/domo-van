#pragma once

class TemperatureSensor {
public:
  virtual ~TemperatureSensor() = default;

  // Returns the current temperature in degrees Celsius
  virtual float read() = 0;
};
