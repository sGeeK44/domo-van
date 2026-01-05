#include "UltrasonicSensor.h"

UltrasonicSensor::UltrasonicSensor(Stream &stream, Logger *logger) : _serial(stream), _logger(logger) {};

int UltrasonicSensor::read() {
  if (Serial2.available() < PACKET_SIZE) {
    _logger->debug("Frame not complete done - waiting for more data");
    return -1;
  }

  if (Serial2.read() != PACKET_HEADER) {
    _logger->debug("Header missing - byte ignored.");
    return -1;
  }

  unsigned char highPart = _serial.read();
  unsigned char lowPart = _serial.read();
  unsigned char checksum = _serial.read();

  if (checksum != computeChecksum(highPart, lowPart)) {
    _logger->debug("Checksum error - packet ignored");
    return -1;
  }

  return (highPart << 8) + lowPart; // raw mm
}

unsigned char UltrasonicSensor::computeChecksum(unsigned char high, unsigned char low) {
  return (unsigned char)((PACKET_HEADER + high + low) & 0xFF);
}
