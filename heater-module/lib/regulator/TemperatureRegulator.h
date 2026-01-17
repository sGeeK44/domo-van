#pragma once
#include "Fan.h"
#include "Logger.h"
#include "Settings.h"
#include "TemperatureSensor.h"

class TemperatureRegulator {
public:
  TemperatureRegulator(TemperatureSensor *sensor, Fan *fan, Settings *settings, Logger *logger);

  void setSetpoint(float celsius);
  float getSetpoint() const;
  void update();

  void start();
  void stop();
  bool isRunning() const;
  float getCurrentTemp();

private:
  TemperatureSensor *_sensor;
  Fan *_fan;
  Settings *_settings;
  Logger *_logger;

  float _setpoint;
  float _integral;
  float _lastError;
  unsigned long _lastUpdateTime;
  bool _firstUpdate;
  bool _running;
  float _lastTemp;

  // Settings keys
  static constexpr const char *KEY_KP = "heater_kp";
  static constexpr const char *KEY_KI = "heater_ki";
  static constexpr const char *KEY_KD = "heater_kd";

  // Default PID gains (stored as int * 100 in settings)
  static constexpr int DEFAULT_KP = 1000; // 10.0
  static constexpr int DEFAULT_KI = 10;   // 0.1
  static constexpr int DEFAULT_KD = 50;   // 0.5

  // Anti-windup limits
  static constexpr float INTEGRAL_MAX = 10000.0f;
  static constexpr float INTEGRAL_MIN = -10000.0f;

  float getKp();
  float getKi();
  float getKd();
  int clamp(int value, int min, int max);
};
