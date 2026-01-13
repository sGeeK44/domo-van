#pragma once

#include "Settings.h"
#include <string>

// Small helper injected into listeners to access tank settings via a prefix
// (ex: "clean", "grey") without having tank-specific branching in the listener.
class TankSettings {
  Settings *_settings = nullptr;
  std::string _name;

public:
  TankSettings(Settings *settings, const std::string &name) : _settings(settings), _name(name) {}
  TankSettings(Settings *settings, const char *name) : _settings(settings), _name(name) {}

  int getVolumeLiters() const { return _settings->getTankVolumeLiters(_name.c_str()); }
  void setVolumeLiters(int liters) const { _settings->setTankVolumeLiters(_name.c_str(), liters); }

  int getHeightMm() const { return _settings->getTankHeightMm(_name.c_str()); }
  void setHeightMm(int heightMm) const { _settings->setTankHeightMm(_name.c_str(), heightMm); }
};
