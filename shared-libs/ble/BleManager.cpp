#include "BleManager.h"
#include "AdminListner.h"
#include "BleUuid.h"
#include "Check.h"
#include "Logger.h"
#include <Arduino.h>

void BleManager::setup(std::string defaultName, std::string serviceId) {
  _logger->info("Setup BLE...");
  _serviceId = serviceId;
  _serviceUuid = buildServiceUuid(serviceId.c_str());
  AdminSettings adminSettings(_settings);
  const std::string deviceName = adminSettings.getDeviceName(defaultName);

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
  NimBLEDevice::setSecurityPasskey(adminSettings.getPinCode());

  // Force the phone to ask the user to enter the code that the ESP32 "displays"
  // (our fixed code).
  NimBLEDevice::setSecurityIOCap(BLE_HS_IO_DISPLAY_ONLY);

  NimBLEServer *server = NimBLEDevice::createServer();
  _connectionListner = new BleConnectionListner(_logger);
  server->setCallbacks(_connectionListner);

  _service = server->createService(_serviceUuid.c_str());
  _adminChannel =
      new BleChannel(_service, _connectionListner, new AdminListener(_settings, _logger), _serviceId.c_str(), _logger);
  _logger->info("BLE setup complete, advertising as %s", deviceName.c_str());
}

void BleManager::start() {
  _logger->info("Starting BLE service...");
  _service->start();

  _logger->debug("Starting advertising...");
  NimBLEAdvertising *advertising = NimBLEDevice::getAdvertising();
  advertising->addServiceUUID(_serviceUuid.c_str());
  advertising->start();
}

BleChannel *BleManager::addChannel(BleListner *listner) {
  return new BleChannel(_service, _connectionListner, listner, _serviceId.c_str(), _logger);
}

bool BleManager::isConnected() { return _connectionListner->isConnected(); }