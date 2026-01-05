#include "Logger.h"
#include <Arduino.h>
// Sensor: HC-SR04-like UART ultrasonic sensor
// Wiring notes:
// Red => VCC (5V), Black => GND, White => TX, Yellow => RX
// ESP32 connections: White (sensor TX) -> ESP_RX2, Yellow (sensor RX) -> ESP_TX2
#define ESP_RX2 16
#define ESP_TX2 17
#define STANDARD_BAUD 9600
#define PACKET_SIZE 4 // 1 byte header + 2 bytes distance (high & low) + 1 byte checksum
#define PACKET_HEADER 0xFF

unsigned char computeChecksum(unsigned char high, unsigned char low);

static Logger *logger = nullptr;

void setup() {
  // instantiate logger with Serial in setup
  Serial.begin(STANDARD_BAUD);
  logger = new Logger(Serial, Logger::INFO);
  Serial2.begin(STANDARD_BAUD, SERIAL_8N1, ESP_RX2, ESP_TX2);
  logger->info("--- Setup done ---");
}

void loop() {
  if (Serial2.available() < PACKET_SIZE) {
    logger->debug("Frame not complete done - waiting for more data");
    return;
  }

  if (Serial2.read() != PACKET_HEADER) {
    logger->debug("Header missing - byte ignored.");
    return;
  }

  unsigned char highPart = Serial2.read();
  unsigned char lowPart = Serial2.read();
  unsigned char checksum = Serial2.read();

  if (checksum != computeChecksum(highPart, lowPart)) {
    logger->debug("Checksum error - packet ignored");
    return;
  }

  int distance = (highPart << 8) + lowPart; // raw mm

  // print filtered distance only
  logger->info("Distance: %d mm", distance);
}

unsigned char computeChecksum(unsigned char high, unsigned char low) { return (PACKET_HEADER + high + low) & 0xFF; }