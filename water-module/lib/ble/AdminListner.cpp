#include "AdminListner.h"
#include "Check.h"
#include <Arduino.h>
#include <NimBLEDevice.h>
#include <algorithm>
#include <cctype>

namespace {
constexpr const char *ACK_OK = "OK";
constexpr const char *ERR_UNKNOWN_CMD = "ERR_UNKNOWN_CMD";
constexpr const char *ERR_PIN_LEN = "ERR_PIN_LEN";
constexpr const char *ERR_PIN_NUM = "ERR_PIN_NUM";
constexpr const char *ERR_NAME_LEN = "ERR_NAME_LEN";
constexpr const char *ERR_NAME_CHARS = "ERR_NAME_CHARS";

} // namespace

void AdminListener::onReceive(std::string value) {
  _logger->debug("Received command: %s", value.c_str());
  const char *ack = ERR_UNKNOWN_CMD;
  bool shouldReboot = false;

  if (startsWith(value, "PIN:")) {
    ack = this->setNewPin(value.substr(4));
    shouldReboot = (ack == ACK_OK);
  } else if (startsWith(value, "NAME:")) {
    ack = this->setNewDeviceName(value.substr(5));
    shouldReboot = (ack == ACK_OK);
  }

  // Send ACK to the phone (Admin TX characteristic)
  // Note: keep it short (<20 bytes) for maximum BLE compatibility.
  _logger->info("Admin command ACK: %s", ack);
  this->send(std::string(ack));

  if (!shouldReboot) {
    return;
  }

  // Delete old link (mandatory) to force client to refresh/reconnect with new PIN.
  NimBLEDevice::deleteAllBonds();

  // Give the BLE stack time to flush the notification before rebooting.
  delay(500);

  _logger->info("Reboot to apply new settings...");
  ESP.restart();
}

const char *AdminListener::setNewDeviceName(const std::string &newName) {
  if (newName.size() < 1) {
    _logger->info("New name contains 1 caracters at least");
    return ERR_NAME_LEN;
  }

  if (newName.size() > 20) {
    _logger->info("New name contains maximum 20 caracters");
    return ERR_NAME_LEN;
  }

  if (!isAlphaNumericSentence(newName)) {
    _logger->info("New name can contains only AplhaNumeric, ' ', '-' and '_' caracters");
    return ERR_NAME_CHARS;
  }

  _logger->info("Set new device name: %s", newName.c_str());
  _settings->setDeviceName(newName);
  return ACK_OK;
}

const char *AdminListener::setNewPin(const std::string &newPinStr) {
  if (newPinStr.size() != 6) {
    _logger->info("New PIN must contains 6 caracters");
    return ERR_PIN_LEN;
  }

  if (!isNumeric(newPinStr)) {
    _logger->info("New PIN must be numeric");
    return ERR_PIN_NUM;
  }

  _logger->info("Set new PIN");
  _settings->setPinCode(std::stoi(newPinStr));
  return ACK_OK;
}