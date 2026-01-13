#pragma once
#include "AdminSettings.h"
#include "BleListner.h"
#include "Logger.h"
#include "Settings.h"
#include <string>

class AdminListener : public BleListner {
  Logger *_logger = nullptr;
  AdminSettings *_settings = nullptr;
  void onReceive(std::string value) override;
  const char *setNewDeviceName(const std::string &newName);
  const char *setNewPin(const std::string &newPinCode);

public:
  AdminListener(Settings *settings, Logger *logger) : _settings(new AdminSettings(settings)), _logger(logger) {
    this->name = "Admin Channel";
    this->txUuid = "aaf8707e-2734-4e30-94b8-8d2725a5cedb";
    this->rxUuid = "aaf8707e-2734-4e30-94b8-8d2725a5cedc";
  }
};