#include "Program.h"
#include "BleManager.h"
#include "EmaFilter.h"
#include "InputSignal.h"
#include "Logger.h"
#include "MedianFilter.h"
#include "UltrasonicSensor.h"
#include <Arduino.h>

class WaterTankListner : public BleListner {
  void onReceive(std::string value) override {}

public:
  WaterTankListner() {
    this->name = "Water Tank Channel";
    this->txUuid = "aaf8707e-2734-4e30-94b8-8d2725a5ced0";
    this->rxUuid = "aaf8707e-2734-4e30-94b8-8d2725a5ced1";
  }
};

void Program::setup(Stream &serial, Stream &serial2) {
  _logger = new Logger(serial, Logger::INFO);
  _logger->info("Starting water tank module...");

  _bleManager = new BleManager(_logger, _settings);
  _bleManager->setup();
  _cleanWaterTank = _bleManager->addChannel(new WaterTankListner());
  _bleManager->start();

  _logger->debug("Setup Sensor...");
  _input = new InputSignal(new UltrasonicSensor(serial2, _logger));
  _input->addFilter(new MedianFilter(9));
  _input->addFilter(new EmaFilter(0.5));

  _logger->info("Setup done");
}

void Program::loop() {
  int distance = _input->read();
  if (distance < 0) {
    _logger->debug("Sensor not available yet");
    return;
  }
  _logger->debug("Distance: %d mm", distance);
  delay(110);

  char buf[32];
  snprintf(buf, sizeof(buf), "D:%d\n", distance);
  _cleanWaterTank->sendData(buf);
}
