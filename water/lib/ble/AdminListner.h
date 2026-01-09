#pragma once
#include "BleListner.h"
#include "Logger.h"
#include "Settings.h"

class AdminListener : public BleListner {
  Logger *_logger = nullptr;
  Settings *_settings = nullptr;
  void onReceive(std::string value) override;
  void setNewDeviceName(String newName);
  void setNewPin(String newPinCode);

public:
  AdminListener(Settings *settings, Logger *logger) : _settings(settings), _logger(logger) {
    this->name = "Admin Channel";
    this->txUuid = "aaf8707e-2734-4e30-94b8-8d2725a5cedb";
    this->rxUuid = "aaf8707e-2734-4e30-94b8-8d2725a5cedc";
  }
};