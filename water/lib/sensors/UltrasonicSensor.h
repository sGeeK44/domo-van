#pragma once
#include "Logger.h"
#include "SensorBase.h"
#include <Arduino.h>

class UltrasonicSensor : public Sensor {
public:
  UltrasonicSensor(Stream &stream, Logger *logger);

  // Non-blocking: returns distance in mm if a valid packet is available,
  // otherwise returns -1.
  int read();
  int maxRange() override { return 1000; } // 1 meters max range

private:
  Stream &_serial;
  Logger *_logger;
  static const int PACKET_SIZE = 4; // 1 byte header + 2 bytes distance (high & low) + 1 byte checksum
  static const uint8_t PACKET_HEADER = 0xFF;

  unsigned char computeChecksum(unsigned char high, unsigned char low);
};
