#pragma once
#include "Fan.h"

class PwmFan : public Fan {
public:
  // pwmPin: GPIO for PWM control signal
  // pwmChannel: LEDC channel (0-15 on ESP32)
  PwmFan(int pwmPin, int pwmChannel);

  void setSpeed(int speed) override;

private:
  int _pwmPin;
  int _pwmChannel;

  // 25kHz PWM frequency (4-wire fan standard)
  static constexpr int PWM_FREQ = 25000;
  static constexpr int PWM_RESOLUTION = 8; // 0-255
};
