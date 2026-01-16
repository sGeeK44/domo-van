#pragma once

#include "Settings.h"
#include <string>

class ValveSettings {
  Settings *_settings = nullptr;
  std::string _name;

public:
  ValveSettings(Settings *settings, const std::string &name) : _settings(settings), _name(name) {}
  ValveSettings(Settings *settings, const char *name) : _settings(settings), _name(name) {}

  int getAutoCloseSeconds();
  void setAutoCloseSeconds(int seconds);
};
