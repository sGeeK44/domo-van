#include "Program.h"
#include "BleManager.h"
#include "EmaFilter.h"
#include "InputSignal.h"
#include "Logger.h"
#include "MedianFilter.h"
#include "TankValveListner.h"
#include "UltrasonicSensor.h"
#include "WaterTankListner.h"
#include <Arduino.h>

#define DEEP_SLEEP_SECONDS 5
#define ADVERTISE_SECONDS 5

void Program::setup(Stream &serial, Stream &serial1, Stream &serial2, int relayPin) {
  _logger = new Logger(serial, Logger::INFO);
  _logger->info("Starting water tank module...");

  _bleManager = new BleManager(_logger, _settings);
  _bleManager->setup();

  _cleanTank = createNotifier("Clean Water Tank", "aaf8707e-2734-4e30-94b8-8d2725a5ced0",
                              "aaf8707e-2734-4e30-94b8-8d2725a5ced1", serial1, _logger);
  _greyTank = createNotifier("Grey Water Tank", "aaf8707e-2734-4e30-94b8-8d2725a5ced2",
                             "aaf8707e-2734-4e30-94b8-8d2725a5ced3", serial2, _logger);

  _bleManager->addChannel(new TankValveListner("Grey Water Tank Valve", "aaf8707e-2734-4e30-94b8-8d2725a5ced4",
                                               "aaf8707e-2734-4e30-94b8-8d2725a5ced5", relayPin));

  _bleManager->start();

  _startAt = millis();
  _logger->info("Setup done. Waiting for connection...");
}

void Program::loop() {
  if (_bleManager->isConnected()) {
    _cleanTank->notify();
    _greyTank->notify();
    delay(110);
  } else if (millis() - _startAt > (ADVERTISE_SECONDS * 1000)) {
    _logger->info("Timeout -> Deep Sleep");
    _logger->flush();
    esp_sleep_enable_timer_wakeup(DEEP_SLEEP_SECONDS * 1000000ULL);
    esp_deep_sleep_start();
  }

  delay(500);
}

WaterTankNotifier *Program::createNotifier(const char *name, const char *txUuid, const char *rxUuid, Stream &stream,
                                           Logger *logger) {
  logger->info("Setup %s...", name);
  BleChannel *cleanTankChannel = _bleManager->addChannel(new WaterTankListner(name, txUuid, rxUuid));
  InputSignal *cleanTankInput = new InputSignal(new UltrasonicSensor(stream, _logger));
  cleanTankInput->addFilter(new MedianFilter(9));
  cleanTankInput->addFilter(new EmaFilter(0.5));
  return new WaterTankNotifier(name, cleanTankChannel, cleanTankInput, _logger);
}
