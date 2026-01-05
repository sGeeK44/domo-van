#include <Arduino.h>
// Sensor: HC-SR04 or similar UART-based ultrasonic distance sensor
// Red => VCC (5v)
// Black => GND
// White => TX
// Yellow => RX

// Sensor wire connections for ESP32
// White (TX)  <---> GPIO16 (RX2)
// Yellow (RX) <---> GPIO17 (TX2)
#define ESP_RX2 16
#define ESP_TX2 17
#define STANDARD_BAUD 9600
#define PACKET_SIZE 4 // 1 byte header + 2 bytes distance (high & low) + 1 byte checksum
#define PACKET_HEADER 0xFF

unsigned char computeChecksum(unsigned char high, unsigned char low);

void setup() {
  Serial.begin(STANDARD_BAUD);
  Serial2.begin(STANDARD_BAUD, SERIAL_8N1, RX2, TX2);
  Serial.println("--- Setup done ---");
}

void loop() {
  if (Serial2.available() < PACKET_SIZE) {
    Serial.println("Frame not complete done - waiting for more data");
    return;
  }

  if (Serial2.read() != PACKET_HEADER) {
    Serial.println("Header missing - byte ignored.");
    return;
  }

  unsigned char highPart = Serial2.read();
  unsigned char lowPart = Serial2.read();
  unsigned char checksum = Serial2.read();

  if (checksum != computeChecksum(highPart, lowPart)) {
    Serial.println("Checksum error - packet ignored");
    return;
  }

  int distance = (highPart << 8) + lowPart;
  Serial.printf("Distance: %d mm\n", distance);
}

unsigned char computeChecksum(unsigned char high, unsigned char low) { return (PACKET_HEADER + high + low) & 0xFF; }