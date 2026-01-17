#include "Program.h"
#include "BleManager.h"
#include "Logger.h"
#include <Arduino.h>
#include <string>

#define DEEP_SLEEP_SECONDS 5
#define ADVERTISE_SECONDS 5

void Program::setup(Stream &serial) {
  _logger = new Logger(serial, Logger::INFO);
  _logger->info("Starting heater tank module...");

  _bleManager = new BleManager(_logger, _settings);
  _bleManager->setup();
  _bleManager->start();

  _startAt = millis();
  _logger->info("Setup done. Waiting for connection...");
}

void Program::loop() {
  if (_bleManager->isConnected()) {
    delay(110);
    return;
  }

  if (millis() - _startAt > (ADVERTISE_SECONDS * 1000)) {
    _logger->info("Timeout -> Deep Sleep");
    _logger->flush();
    esp_sleep_enable_timer_wakeup(DEEP_SLEEP_SECONDS * 1000000ULL);
    esp_deep_sleep_start();
  }

  delay(500);
}
