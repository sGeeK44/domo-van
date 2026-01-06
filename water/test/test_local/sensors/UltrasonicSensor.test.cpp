#include "UltrasonicSensor.h"
#include "../MockStream.h"
#include "Logger.h"
#include <Arduino.h>
#include <gtest/gtest.h>

class UltrasonicSensorTest : public ::testing::Test {
protected:
  MockStream mockStream;
  MockStream logStream;
  Logger *logger;
  UltrasonicSensor *sensor;

  // Runs before every TEST_F
  void SetUp() override {
    mockStream.reset();
    logStream.reset();
    logger = new Logger(logStream, Logger::INFO);
    sensor = new UltrasonicSensor(mockStream, logger);
  }

  // Runs after every TEST_F
  void TearDown() override {
    delete sensor;
    delete logger;
  }
};

TEST_F(UltrasonicSensorTest, ReadReturnsMinus1WhenNotEnoughData) {
  mockStream.addByte(0xFF);
  mockStream.addByte(0x01);

  EXPECT_EQ(-1, sensor->read());
}

TEST_F(UltrasonicSensorTest, ReadReturnsMinus1WhenHeaderMissing) {
  mockStream.addByte(0x00);
  mockStream.addByte(0x01);
  mockStream.addByte(0x02);
  mockStream.addByte(0x03);

  EXPECT_EQ(-1, sensor->read());
}

TEST_F(UltrasonicSensorTest, ReadReturnsMinus1OnChecksumError) {
  mockStream.addInvalidChecksumPacket(0x01, 0x00);

  EXPECT_EQ(-1, sensor->read());
}

TEST_F(UltrasonicSensorTest, ReadReturnsDistanceOnValidPacket) {
  mockStream.addPacket(0x01, 0x00);

  EXPECT_EQ(256, sensor->read());
}

TEST_F(UltrasonicSensorTest, ReadReturnsCorrectDistanceForVariousValues) {
  mockStream.addPacket(0x01, 0xF4);

  EXPECT_EQ(500, sensor->read());
}

TEST_F(UltrasonicSensorTest, ReadReturnsZeroDistance) {
  mockStream.addPacket(0x00, 0x00);
  EXPECT_EQ(0, sensor->read());
}

TEST_F(UltrasonicSensorTest, ReadReturnsMaxDistance) {
  mockStream.addPacket(0xFF, 0xFF);
  EXPECT_EQ(65535, sensor->read());
}

TEST_F(UltrasonicSensorTest, MaxRangeReturns1000) { EXPECT_EQ(1000, sensor->maxRange()); }
