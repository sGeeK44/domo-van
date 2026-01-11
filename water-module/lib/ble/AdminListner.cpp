#include "AdminListner.h"
#include "Check.h"
#include <NimBLEDevice.h>

void AdminListener::onReceive(std::string value) {
  String command = String(value.c_str());
  _logger->debug("Received command: %s", command);
  if (command.startsWith("PIN:")) {
    this->setNewPin(command.substring(4));
  }
  if (command.startsWith("NAME:")) {
    this->setNewDeviceName(command.substring(5));
  }

  // Delete old link (mandatory) to force client to refresh/reconnect
  NimBLEDevice::deleteAllBonds();

  // Wait a bit to ensure the data is sent and buffer flushed before rebooting
  delay(1000);

  _logger->info("Reboot to apply new settings...");
  ESP.restart();
}

void AdminListener::setNewDeviceName(String newName) {
  if (newName.length() < 1) {
    _logger->info("New name contains 1 caracters at least");
    return;
  }

  if (newName.length() > 20) {
    _logger->info("New name contains maximum 20 caracters");
    return;
  }

  if (!isAlphaNumericSentence(newName.c_str())) {
    _logger->info("New name can contains only AplhaNumeric, ' ', '-' and '_' caracters");
    return;
  }

  _logger->info("Set new device name: %s", newName.c_str());
  _settings->setDeviceName(newName);
}

void AdminListener::setNewPin(String newPinStr) {
  if (newPinStr.length() != 6) {
    _logger->info("New PIN must contains 6 caracters");
    return;
  }

  if (!isNumeric(newPinStr.c_str())) {
    _logger->info("New PIN must be numeric");
    return;
  }

  _logger->info("Set new PIN");
  _settings->setPinCode(newPinStr.toInt());
}