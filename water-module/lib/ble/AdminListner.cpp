#include "AdminListner.h"
#include "Check.h"
#include <NimBLEDevice.h>

namespace {
constexpr const char *ACK_OK = "OK";
constexpr const char *ERR_UNKNOWN_CMD = "ERR_UNKNOWN_CMD";
constexpr const char *ERR_PIN_LEN = "ERR_PIN_LEN";
constexpr const char *ERR_PIN_NUM = "ERR_PIN_NUM";
constexpr const char *ERR_NAME_LEN = "ERR_NAME_LEN";
constexpr const char *ERR_NAME_CHARS = "ERR_NAME_CHARS";
} // namespace

void AdminListener::onReceive(std::string value) {
  String command = String(value.c_str());
  _logger->debug("Received command: %s", command);
  const char *ack = ERR_UNKNOWN_CMD;
  bool shouldReboot = false;

  if (command.startsWith("PIN:")) {
    ack = this->setNewPin(command.substring(4));
    shouldReboot = (ack == ACK_OK);
  } else if (command.startsWith("NAME:")) {
    ack = this->setNewDeviceName(command.substring(5));
    shouldReboot = (ack == ACK_OK);
  }

  // Send ACK to the phone (Admin TX characteristic)
  // Note: keep it short (<20 bytes) for maximum BLE compatibility.
  _logger->info("Admin command ACK: %s", ack);
  this->send(std::string(ack));

  if (!shouldReboot) {
    // Stay connected so the client can retry.
    return;
  }

  // Give the BLE stack time to flush the notification before rebooting.
  delay(500);

  // Delete old link (mandatory) to force client to refresh/reconnect with new PIN.
  NimBLEDevice::deleteAllBonds();

  delay(500);
  _logger->info("Reboot to apply new settings...");
  ESP.restart();
}

const char *AdminListener::setNewDeviceName(String newName) {
  if (newName.length() < 1) {
    _logger->info("New name contains 1 caracters at least");
    return ERR_NAME_LEN;
  }

  if (newName.length() > 20) {
    _logger->info("New name contains maximum 20 caracters");
    return ERR_NAME_LEN;
  }

  if (!isAlphaNumericSentence(newName.c_str())) {
    _logger->info("New name can contains only AplhaNumeric, ' ', '-' and '_' caracters");
    return ERR_NAME_CHARS;
  }

  _logger->info("Set new device name: %s", newName.c_str());
  _settings->setDeviceName(newName);
  return ACK_OK;
}

const char *AdminListener::setNewPin(String newPinStr) {
  if (newPinStr.length() != 6) {
    _logger->info("New PIN must contains 6 caracters");
    return ERR_PIN_LEN;
  }

  if (!isNumeric(newPinStr.c_str())) {
    _logger->info("New PIN must be numeric");
    return ERR_PIN_NUM;
  }

  _logger->info("Set new PIN");
  _settings->setPinCode(newPinStr.toInt());
  return ACK_OK;
}