#include "BleChannel.h"

BleChannel::BleChannel(NimBLEService *service, BleConnectionListner *connectionListner, BleListner *listner,
                       Logger *logger) {
  logger->info("Creating BLE Channel: %s", listner->name);
  _connectionListner = connectionListner;
  _listner = listner;
  _logger = logger;

  logger->debug("Creating TX Port: %s", listner->txUuid);
  _txPort = service->createCharacteristic(listner->txUuid, NIMBLE_PROPERTY::READ_AUTHEN | NIMBLE_PROPERTY::NOTIFY);
  _txPort->createDescriptor(HUMAN_READABLE_NAME, NIMBLE_PROPERTY::READ)->setValue(std::string(listner->name) + " (TX)");

  logger->debug("Creating RX Port: %s", listner->rxUuid);
  NimBLECharacteristic *rxChannel =
      service->createCharacteristic(listner->rxUuid, NIMBLE_PROPERTY::WRITE | NIMBLE_PROPERTY::WRITE_AUTHEN);
  rxChannel->createDescriptor(HUMAN_READABLE_NAME, NIMBLE_PROPERTY::READ)
      ->setValue(std::string(listner->name) + " (RX)");
  rxChannel->setCallbacks(this);

  _listner->onChannelAttach(this);
  logger->debug("BLE Channel %s created", listner->name);
}

void BleChannel::sendData(const std::string &data) {
  if (!_connectionListner->isConnected()) {
    return;
  }

  // In standard BLE, we avoid sending more than 20 bytes per packet
  // to ensure it works on all phones (Android/iOS) without negotiating the MTU.
  size_t chunkSize = 20;
  for (size_t i = 0; i < data.length(); i += chunkSize) {
    std::string chunck = data.substr(i, std::min(data.length() - i, chunkSize));
    _txPort->setValue((uint8_t *)chunck.c_str(), chunck.length());
    _txPort->notify();

    // Critical pause
    // This allows the Bluetooth stack to process the send
    // Without this, you will lose packets
    delay(10);
  }
}

void BleChannel::onWrite(NimBLECharacteristic *channel) {
  std::string rxValue = channel->getValue();
  if (rxValue.length() > 0) {
    _logger->debug("\nReceived from phone: %s", rxValue);
    _listner->onReceive(rxValue);
  }
}
