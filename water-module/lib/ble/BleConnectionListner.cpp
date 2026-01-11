#include <BleConnectionListner.h>

bool BleConnectionListner::isConnected() { return _deviceConnected; }

void BleConnectionListner::onConnect(NimBLEServer *server) {
  _deviceConnected = true;
  if (_logger) {
    _logger->info("BLE Client Connected");
  }
};

void BleConnectionListner::onDisconnect(NimBLEServer *server) {
  _deviceConnected = false;
  if (_logger) {
    _logger->info("BLE Client Disconnected");
  }
  NimBLEDevice::startAdvertising();
};

void BleConnectionListner::onAuthenticationComplete(ble_gap_conn_desc *desc) {
  if (desc->sec_state.encrypted) {
    _logger->info("Success: Secure connection established!");
  }
}
