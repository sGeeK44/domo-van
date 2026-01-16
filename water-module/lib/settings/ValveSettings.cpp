#include "ValveSettings.h"
#include <string>

int ValveSettings::getAutoCloseSeconds() {
  const std::string key = std::string(_name) + "_ac_s";
  return _settings->get(key.c_str(), 30);
}

void ValveSettings::setAutoCloseSeconds(int seconds) {
  const std::string key = std::string(_name) + "_ac_s";
  _settings->save(key.c_str(), seconds);
}
