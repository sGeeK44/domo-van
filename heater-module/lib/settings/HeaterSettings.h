#pragma once

#include "Settings.h"
#include <string>

class HeaterSettings {
  Settings *_settings = nullptr;
  std::string _name;

public:
  HeaterSettings(Settings *settings, const std::string &name) : _settings(settings), _name(name) {}
  HeaterSettings(Settings *settings, const char *name) : _settings(settings), _name(name) {}

  int getKp();
  void setKp(int value);

  int getKi();
  void setKi(int value);

  int getKd();
  void setKd(int value);

  // Default PID gains (stored as int * 100)
  static constexpr int DEFAULT_KP = 1000; // 10.0
  static constexpr int DEFAULT_KI = 10;   // 0.1
  static constexpr int DEFAULT_KD = 50;   // 0.5
};
