#include "BleListner.h"
#include "BleChannel.h"

void BleListner::onChannelAttach(BleChannel *channel) { _channel = channel; }

bool BleListner::send(const std::string &data) {
  if (_channel == nullptr)
    return false;
  _channel->sendData(data);
  return true;
}
