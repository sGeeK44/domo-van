#include "Logger.h"
#include "UltrasonicSensor.h"
#include <Arduino.h>
// Sensor: HC-SR04-like UART ultrasonic sensor
// Wiring notes:
// Red => VCC (5V), Black => GND, White => TX, Yellow => RX
// ESP32 connections: White (sensor TX) -> ESP_RX2, Yellow (sensor RX) -> ESP_TX2
#define ESP_RX2 16
#define ESP_TX2 17
#define STANDARD_BAUD 9600

static Logger *logger = nullptr;
static UltrasonicSensor *sensor = nullptr;

void setup() {
  Serial.begin(STANDARD_BAUD);
  logger = new Logger(Serial, Logger::INFO);
  Serial2.begin(STANDARD_BAUD, SERIAL_8N1, ESP_RX2, ESP_TX2);
  sensor = new UltrasonicSensor(Serial2, logger);
  logger->info("--- Setup done ---");
}

void loop() {
  int distance = sensor->readDistance();
  if (distance < 0) {
    logger->debug("Sensor not available yet");
    return;
  }

  logger->info("Distance: %d mm", distance);
}
