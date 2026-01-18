#pragma once

#include "AdminProtocol.h"
#include "AdminSettings.h"
#include "BleListner.h"
#include "Logger.h"
#include "Settings.h"
#include <string>

class AdminListener : public BleListner {
  Logger *_logger = nullptr;
  AdminSettings *_settings = nullptr;
  AdminProtocol *_protocol = nullptr;
  void onReceive(std::string value) override;

public:
  AdminListener(Settings *settings, Logger *logger)
      : _settings(new AdminSettings(settings)), _protocol(new AdminProtocol(_settings)), _logger(logger) {
    this->name = "Admin Channel";
    this->channelId = "0001";
  }
};