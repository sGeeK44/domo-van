#include "AdminListner.h"
#include <Arduino.h>
#include <NimBLEDevice.h>

void AdminListener::onReceive(std::string value) {
  _logger->debug("Received command: %s", value.c_str());
  const std::string ack = _protocol->handle(value);
  const bool shouldReboot = (ack == "OK");

  // Send ACK to the phone (Admin TX characteristic)
  // Note: keep it short (<20 bytes) for maximum BLE compatibility.
  _logger->info("Admin command ACK: %s", ack.c_str());
  this->send(ack);

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