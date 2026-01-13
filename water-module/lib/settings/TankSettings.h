#pragma once

#include "Settings.h"
#include <string>

class TankSettings {
  Settings *_settings = nullptr;
  std::string _name;

public:
  TankSettings(Settings *settings, const std::string &name) : _settings(settings), _name(name) {}
  TankSettings(Settings *settings, const char *name) : _settings(settings), _name(name) {}

  int getVolumeLiters();
  void setVolumeLiters(int liters);
  int getHeightMm();
  void setHeightMm(int heightMm);
};
