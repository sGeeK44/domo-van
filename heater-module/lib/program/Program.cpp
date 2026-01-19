#include "Program.h"
#include "BleManager.h"
#include "HeaterListner.h"
#include "Logger.h"
#include <Arduino.h>
#include <string>

#define DEEP_SLEEP_SECONDS 5
#define ADVERTISE_SECONDS 5

static constexpr uint8_t SENSOR_PINS[4] = {4, 5, 13, 15};
static constexpr uint8_t FAN_PINS[4] = {16, 17, 18, 19};

// BME280 I2C address (0x76 or 0x77 depending on SDO pin)
static constexpr uint8_t BME280_ADDRESS = 0x76;

// Exterior temperature sensor (DS18B20) pin
static constexpr uint8_t EXTERIOR_SENSOR_PIN = 25;

// BLE channel IDs for heater channels (admin=0001, heaters=0002-0005, environment=0006)
static const char *HEATER_NAMES[4] = {"heater_0", "heater_1", "heater_2", "heater_3"};
static const char *HEATER_CHANNEL_IDS[4] = {"0002", "0003", "0004", "0005"};

void Program::setup(Stream &serial) {
  _logger = new Logger(serial, Logger::INFO);
  _logger->info("Starting heater tank module...");

  _bleManager = new BleManager(_logger, _settings);
  _bleManager->setup("Heater Module", "0002");

  for (int i = 0; i < 4; i++) {
    _sensors[i] = new DS18B20TemperatureSensor(SENSOR_PINS[i], _logger);
    _sensors[i]->begin();
    _fans[i] = new PwmFan(FAN_PINS[i], i);
    _regulators[i] = new TemperatureRegulator(_sensors[i], _fans[i], _settings, _logger);

    _heaterListners[i] = new HeaterListner(HEATER_NAMES[i], HEATER_CHANNEL_IDS[i], _regulators[i], _settings);
    _bleManager->addChannel(_heaterListners[i]);
  }
  _logger->info("Temperature regulators initialized with BLE channels");

  // Initialize BME280 environment sensor (interior)
  _bme280 = new Bme280Sensor(_logger, BME280_ADDRESS);
  _bme280->begin();

  // Initialize exterior temperature sensor (DS18B20)
  _exteriorSensor = new DS18B20TemperatureSensor(EXTERIOR_SENSOR_PIN, _logger);
  _exteriorSensor->begin();

  _environmentListner = new EnvironmentListner("environment", "0006", _bme280, _exteriorSensor);
  _bleManager->addChannel(_environmentListner);
  _logger->info("Environment sensors initialized (BME280 + DS18B20 exterior)");

  _bleManager->start();

  _startAt = millis();
  _logger->info("Setup done. Waiting for connection...");
}

void Program::loop() {
  if (_bleManager->isConnected()) {
    // Update all temperature regulators and send notifications
    for (int i = 0; i < 4; i++) {
      _regulators[i]->update();
      _heaterListners[i]->notify();
    }

    // Send environment data notification
    _environmentListner->notify();

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
