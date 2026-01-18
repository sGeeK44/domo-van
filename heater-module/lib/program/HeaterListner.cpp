#include "HeaterListner.h"

HeaterListner::HeaterListner(const char *name, const char *channelId, TemperatureRegulator *regulator,
                             Settings *settings)
    : _regulator(regulator), _settings(new HeaterSettings(settings, name)) {
  this->name = name;
  this->channelId = channelId;
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

void HeaterListner::notify() {
  float temp = _regulator->getCurrentTemp();
  float sp = _regulator->getSetpoint();
  bool running = _regulator->isRunning();

  int tempInt = static_cast<int>(temp * 10);
  int spInt = static_cast<int>(sp * 10);

  std::string message = "STATUS:T=" + std::to_string(tempInt) +
                        ";SP=" + std::to_string(spInt) +
                        ";RUN=" + (running ? "1" : "0");
  send(message);
}