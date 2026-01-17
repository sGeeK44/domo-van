#include "PwmFan.h"
#include <Arduino.h>

PwmFan::PwmFan(int pwmPin, int pwmChannel) : _pwmPin(pwmPin), _pwmChannel(pwmChannel) {
  // Configure PWM using ESP32 LEDC
  ledcSetup(_pwmChannel, PWM_FREQ, PWM_RESOLUTION);
  ledcAttachPin(_pwmPin, _pwmChannel);
  ledcWrite(_pwmChannel, 0);
}

void PwmFan::setSpeed(int speed) {
  // Clamp to valid PWM range
  if (speed < 0)
    speed = 0;
  if (speed > 255)
    speed = 255;

  ledcWrite(_pwmChannel, speed);
}
