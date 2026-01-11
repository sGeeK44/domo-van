#include "BleManager.h"
#include "AdminListner.h"
#include "Check.h"
#include "Logger.h"
#include <Arduino.h>

const char *SERVICE_UUID = "aaf8707e-2734-4e30-94b8-8d2725a5ceca";

void BleManager::setup() {
  _logger->info("Setup BLE...");
  const String deviceName = _settings->getDeviceName();

  // Set display name for bluetooth discovery
  NimBLEDevice::init(deviceName.c_str());

  // Increase the TX power (more range)
  NimBLEDevice::setPower(ESP_PWR_LVL_P9);

  /* Security Configuration
   * - Bonding : true (remember the device)
   * - MITM : true (Protection Man in the Middle -> Force the PIN code)
   * - Secure Connection : true
   */
  NimBLEDevice::setSecurityAuth(true, true, true);

  // Set the fixed PIN code
  NimBLEDevice::setSecurityPasskey(_settings->getPinCode());

  // Force the phone to ask the user to enter the code that the ESP32 "displays" (our fixed code).
  NimBLEDevice::setSecurityIOCap(BLE_HS_IO_DISPLAY_ONLY);

  NimBLEServer *server = NimBLEDevice::createServer();
  _connectionListner = new BleConnectionListner(_logger);
  server->setCallbacks(_connectionListner);

  _service = server->createService(SERVICE_UUID);
  _adminChannel = new BleChannel(_service, _connectionListner, new AdminListener(_settings, _logger), _logger);
  _logger->info("BLE setup complete, advertising as %s", deviceName);
}

void BleManager::start() {
  _logger->info("Starting BLE service...");
  _service->start();

  _logger->debug("Starting advertising...");
  NimBLEAdvertising *advertising = NimBLEDevice::getAdvertising();
  advertising->addServiceUUID(SERVICE_UUID);
  advertising->start();
}

BleChannel *BleManager::addChannel(BleListner *listner) {
  return new BleChannel(_service, _connectionListner, listner, _logger);
}

bool BleManager::isConnected() { return _connectionListner->isConnected(); }