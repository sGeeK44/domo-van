#pragma once
#include <Arduino.h>
#include <cstdarg>
#include <cstdio>
#include <vector>

class MockStream : public Stream {
public:
  std::vector<uint8_t> input;
  std::vector<uint8_t> output;
  size_t readIndex = 0;

  void reset() {
    input.clear();
    output.clear();
    readIndex = 0;
  }

  void addByte(uint8_t b) { input.push_back(b); }

  size_t write(uint8_t b) override {
    output.push_back(b);
    return 1;
  }

  size_t write(const uint8_t *buffer, size_t size) override {
    for (size_t i = 0; i < size; i++) {
      write(buffer[i]);
    }
    return size;
  }

  void addPacket(uint8_t high, uint8_t low) {
    uint8_t header = 0xFF;
    uint8_t checksum = (header + high + low) & 0xFF;
    addByte(header);
    addByte(high);
    addByte(low);
    addByte(checksum);
  }

  void addInvalidChecksumPacket(uint8_t high, uint8_t low) {
    uint8_t header = 0xFF;
    addByte(header);
    addByte(high);
    addByte(low);
    addByte(0x01);
  }

  int available() override { return static_cast<int>(input.size() - readIndex); }

  int read() override {
    if (readIndex < input.size()) {
      return input[readIndex++];
    }
    return -1;
  }

  int peek() override {
    if (readIndex < input.size()) {
      return input[readIndex];
    }
    return -1;
  }

  void flush() override {}
};