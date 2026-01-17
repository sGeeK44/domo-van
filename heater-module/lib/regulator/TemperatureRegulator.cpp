#include "TemperatureRegulator.h"
#include <Arduino.h>

TemperatureRegulator::TemperatureRegulator(TemperatureSensor *sensor, Fan *fan, Settings *settings, Logger *logger)
    : _sensor(sensor), _fan(fan), _settings(settings), _logger(logger), _setpoint(20.0f), _integral(0.0f),
      _lastError(0.0f), _lastUpdateTime(0), _firstUpdate(true), _running(false), _lastTemp(0.0f) {}

void TemperatureRegulator::setSetpoint(float celsius) {
  _setpoint = celsius;
  _logger->info("Setpoint changed to %.1f C", celsius);
}

float TemperatureRegulator::getSetpoint() const { return _setpoint; }

void TemperatureRegulator::start() {
  _running = true;
  _logger->info("Regulator started");
}

void TemperatureRegulator::stop() {
  _running = false;
  _fan->setSpeed(0);
  _logger->info("Regulator stopped");
}

bool TemperatureRegulator::isRunning() const { return _running; }

float TemperatureRegulator::getCurrentTemp() {
  _lastTemp = _sensor->read();
  _logger->debug("Temperature read: %.1f C", _lastTemp);
  return _lastTemp;
}

void TemperatureRegulator::update() {
  if (!_running) {
    return;
  }

  unsigned long currentTime = millis();

  // Calculate time delta in seconds
  float dt = 0.0f;
  if (_firstUpdate) {
    _firstUpdate = false;
    _lastUpdateTime = currentTime;
    dt = 0.1f; // Default dt for first iteration
  } else {
    dt = (currentTime - _lastUpdateTime) / 1000.0f;
    _lastUpdateTime = currentTime;
  }

  // Avoid division by zero or very small dt
  if (dt < 0.001f) {
    dt = 0.001f;
  }

  // Read current temperature
  float currentTemp = _sensor->read();

  // Calculate error (positive when too cold, need more heating)
  float error = _setpoint - currentTemp;

  // Proportional term
  float pTerm = getKp() * error;

  // Integral term with anti-windup
  _integral += error * dt;
  if (_integral > INTEGRAL_MAX) {
    _integral = INTEGRAL_MAX;
  } else if (_integral < INTEGRAL_MIN) {
    _integral = INTEGRAL_MIN;
  }
  float iTerm = getKi() * _integral;

  // Derivative term
  float derivative = (error - _lastError) / dt;
  float dTerm = getKd() * derivative;
  _lastError = error;

  // Calculate output
  float output = pTerm + iTerm + dTerm;

  // Clamp to PWM range (0-255)
  int fanSpeed = clamp((int)output, 0, 255);

  // Apply to fan
  _fan->setSpeed(fanSpeed);

  _logger->debug("PID: temp=%.1f, sp=%.1f, err=%.1f, P=%.1f, I=%.1f, D=%.1f, out=%d", currentTemp, _setpoint, error,
                 pTerm, iTerm, dTerm, fanSpeed);
}

float TemperatureRegulator::getKp() { return _settings->get(KEY_KP, DEFAULT_KP) / 100.0f; }

float TemperatureRegulator::getKi() { return _settings->get(KEY_KI, DEFAULT_KI) / 100.0f; }

float TemperatureRegulator::getKd() { return _settings->get(KEY_KD, DEFAULT_KD) / 100.0f; }

int TemperatureRegulator::clamp(int value, int min, int max) {
  if (value < min)
    return min;
  if (value > max)
    return max;
  return value;
}
