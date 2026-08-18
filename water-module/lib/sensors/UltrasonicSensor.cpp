#include "UltrasonicSensor.h"

UltrasonicSensor::UltrasonicSensor(Stream &stream, Logger *logger) : _serial(stream), _logger(logger) {}

int UltrasonicSensor::read() {
  int lastDistance = -1;

  while (_serial.available() >= PACKET_SIZE) {
    int distance = readPacket();
    if (distance >= 0) {
      lastDistance = distance;
    }
  }

  if (lastDistance < 0) {
    _logger->debug("Frame not complete done - waiting for more data");
  }
  return lastDistance;
}

int UltrasonicSensor::readPacket() {
  if (_serial.read() != PACKET_HEADER) {
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
