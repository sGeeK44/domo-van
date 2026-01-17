#include "HeaterListner.h"

HeaterListner::HeaterListner(const char *name, const char *txUuid, const char *rxUuid, TemperatureRegulator *regulator,
                             Settings *settings)
    : _regulator(regulator), _settings(new HeaterSettings(settings, name)) {
  this->name = name;
  this->txUuid = txUuid;
  this->rxUuid = rxUuid;
  _protocol = new HeaterCfgProtocol(_settings, _regulator);
}

HeaterListner::~HeaterListner() {
  delete _protocol;
  delete _settings;
}

void HeaterListner::onReceive(std::string value) {
  if (value.empty()) {
    return;
  }

  std::string response = _protocol->handle(value);
  if (!response.empty()) {
    send(response);
  }
}
