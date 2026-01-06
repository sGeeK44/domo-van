#include "Arduino.h"
#include "Program.h"
// Sensor: HC-SR04-like UART ultrasonic sensor
// Wiring notes:
// Red => VCC (5V), Black => GND, White => TX, Yellow => RX
// ESP32 connections: White (sensor TX) -> ESP_RX2, Yellow (sensor RX) -> ESP_TX2
#define ESP_RX2 16
#define ESP_TX2 17

// Rates for serial communication
#define STANDARD_BAUD 9600

static Program program;

void setup() {
  Serial.begin(STANDARD_BAUD);
  Serial2.begin(STANDARD_BAUD, SERIAL_8N1, ESP_RX2, ESP_TX2);
  program.setup(Serial, Serial2);
}

void loop() { program.loop(); }
