#include "Arduino.h"
#include "Esp32Settings.h"
#include "Program.h"
// Sensor: HC-SR04-like UART ultrasonic sensor
// Wiring notes:
// Red => VCC (5V), Black => GND, White => TX, Yellow => RX
// ESP32 connections: White (sensor TX) -> ESP_RX*, Yellow (sensor RX) -> ESP_TX*
#define ESP_RX1 4
#define ESP_TX1 5
#define ESP_RX2 16
#define ESP_TX2 17

// Relay control for grey water tank valve
#define RELAY_PIN 23

// Rates for serial communication
#define STANDARD_BAUD 9600

static Program program(new Esp32Settings("wt-settings"));

void setup() {
  Serial.begin(STANDARD_BAUD);
  Serial1.begin(STANDARD_BAUD, SERIAL_8N1, ESP_RX1, ESP_TX1);
  Serial2.begin(STANDARD_BAUD, SERIAL_8N1, ESP_RX2, ESP_TX2);
  program.setup(Serial, Serial1, Serial2, RELAY_PIN);
}

void loop() { program.loop(); }
