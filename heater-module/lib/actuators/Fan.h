#pragma once

class Fan {
public:
  virtual ~Fan() = default;

  // Set fan speed (PWM 0-255)
  virtual void setSpeed(int speed) = 0;
};
