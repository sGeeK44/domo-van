#include "Logger.h"
#include "../MockStream.h"
#include "UltrasonicSensor.h"
#include <Arduino.h>
#include <gtest/gtest.h>

class LoggerTest : public ::testing::Test {
protected:
  MockStream mockStream;
};

TEST_F(LoggerTest, DebugLogsWhenLevelIsDebug) {
  Logger logger(mockStream, Logger::DEBUG);

  logger.debug("test message %d", 42);

  std::string expected = "\n[DEBUG] test message 42";
  std::string actual(mockStream.output.begin(), mockStream.output.end());
  EXPECT_EQ(expected, actual);
}

TEST_F(LoggerTest, DebugDoesNotLogWhenLevelIsInfo) {
  Logger logger(mockStream, Logger::INFO);

  logger.debug("test message %d", 42);

  EXPECT_TRUE(mockStream.output.empty());
}

TEST_F(LoggerTest, InfoLogsWhenLevelIsInfo) {
  Logger logger(mockStream, Logger::INFO);

  logger.info("info message %s", "hello");

  std::string expected = "\n[INFO] info message hello";
  std::string actual(mockStream.output.begin(), mockStream.output.end());
  EXPECT_EQ(expected, actual);
}

TEST_F(LoggerTest, InfoLogsWhenLevelIsDebug) {
  Logger logger(mockStream, Logger::DEBUG);

  logger.info("info message %s", "world");

  std::string expected = "\n[INFO] info message world";
  std::string actual(mockStream.output.begin(), mockStream.output.end());
  EXPECT_EQ(expected, actual);
}

TEST_F(LoggerTest, SetLevelChangesLogging) {
  Logger logger(mockStream, Logger::INFO);

  logger.debug("should not log");
  EXPECT_TRUE(mockStream.output.empty());

  logger.setLevel(Logger::DEBUG);
  logger.debug("should log now %d", 1);

  std::string expected = "\n[DEBUG] should log now 1";
  std::string actual(mockStream.output.begin(), mockStream.output.end());
  EXPECT_EQ(expected, actual);
}