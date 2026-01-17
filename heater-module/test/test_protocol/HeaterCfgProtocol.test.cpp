#include "HeaterCfgProtocol.h"
#include "../FakeSettings.h"
#include "../MockStream.h"
#include <ArduinoFake.h>
#include <gtest/gtest.h>
#include <string>

using namespace fakeit;

// Mock TemperatureSensor for testing
class MockTempSensor : public TemperatureSensor {
public:
  float temperature = 20.0f;
  float read() override { return temperature; }
};

// Mock Fan for testing
class MockTestFan : public Fan {
public:
  int speed = 0;
  void setSpeed(int s) override { speed = s; }
};

class HeaterCfgProtocolTest : public ::testing::Test {
protected:
  FakeSettings *settings;
  HeaterSettings *heaterSettings;
  MockTempSensor *sensor;
  MockTestFan *fan;
  MockStream logStream;
  Logger *logger;
  TemperatureRegulator *regulator;
  HeaterCfgProtocol *protocol;

  void SetUp() override {
    ArduinoFake().ClearInvocationHistory();
    settings = new FakeSettings();
    heaterSettings = new HeaterSettings(settings, "test");

    // Set default values
    settings->int_values["test_kp"] = 1000;
    settings->int_values["test_ki"] = 10;
    settings->int_values["test_kd"] = 50;

    sensor = new MockTempSensor();
    fan = new MockTestFan();
    logStream.reset();
    logger = new Logger(logStream, Logger::INFO);
    When(Method(ArduinoFake(), millis)).AlwaysReturn(1000);
    regulator = new TemperatureRegulator(sensor, fan, settings, logger);
    protocol = new HeaterCfgProtocol(heaterSettings, regulator);
  }

  void TearDown() override {
    delete protocol;
    delete regulator;
    delete logger;
    delete fan;
    delete sensor;
    delete heaterSettings;
    delete settings;
  }
};

// CFG? tests
TEST_F(HeaterCfgProtocolTest, CfgQueryRespondsWithCurrentValues) {
  settings->int_values["test_kp"] = 1500;
  settings->int_values["test_ki"] = 25;
  settings->int_values["test_kd"] = 75;

  EXPECT_EQ(protocol->handle("CFG?"), "CFG:KP=1500;KI=25;KD=75");
}

TEST_F(HeaterCfgProtocolTest, CfgQueryUsesDefaultValues) {
  // Clear values to trigger defaults
  settings->int_values.clear();

  HeaterSettings *freshSettings = new HeaterSettings(settings, "fresh");
  HeaterCfgProtocol *freshProtocol = new HeaterCfgProtocol(freshSettings, regulator);

  std::string response = freshProtocol->handle("CFG?");
  EXPECT_EQ(response, "CFG:KP=1000;KI=10;KD=50");

  delete freshProtocol;
  delete freshSettings;
}

// CFG: write tests
TEST_F(HeaterCfgProtocolTest, CfgWritePersistsAndRespondsOk) {
  EXPECT_EQ(protocol->handle("CFG:KP=2000;KI=50;KD=100"), "OK");
  EXPECT_EQ(settings->int_values["test_kp"], 2000);
  EXPECT_EQ(settings->int_values["test_ki"], 50);
  EXPECT_EQ(settings->int_values["test_kd"], 100);
}

TEST_F(HeaterCfgProtocolTest, CfgWriteRejectsMissingFields) {
  EXPECT_EQ(protocol->handle("CFG:KP=100"), "ERR_CFG_FMT");
  EXPECT_EQ(protocol->handle("CFG:KI=100"), "ERR_CFG_FMT");
  EXPECT_EQ(protocol->handle("CFG:KD=100"), "ERR_CFG_FMT");
  EXPECT_EQ(protocol->handle("CFG:KP=100;KI=100"), "ERR_CFG_FMT");
}

TEST_F(HeaterCfgProtocolTest, CfgWriteRejectsNonNumeric) {
  EXPECT_EQ(protocol->handle("CFG:KP=abc;KI=100;KD=100"), "ERR_CFG_NUM");
  EXPECT_EQ(protocol->handle("CFG:KP=100;KI=-1;KD=100"), "ERR_CFG_NUM");
}

TEST_F(HeaterCfgProtocolTest, CfgWriteRejectsOutOfRange) {
  EXPECT_EQ(protocol->handle("CFG:KP=0;KI=100;KD=100"), "ERR_CFG_RANGE");
  EXPECT_EQ(protocol->handle("CFG:KP=100;KI=0;KD=100"), "ERR_CFG_RANGE");
  EXPECT_EQ(protocol->handle("CFG:KP=100;KI=100;KD=0"), "ERR_CFG_RANGE");
  EXPECT_EQ(protocol->handle("CFG:KP=99999;KI=100;KD=100"), "ERR_CFG_RANGE");
}

// START/STOP tests
TEST_F(HeaterCfgProtocolTest, StartReturnsOkAndStartsRegulator) {
  EXPECT_FALSE(regulator->isRunning());
  EXPECT_EQ(protocol->handle("START"), "OK");
  EXPECT_TRUE(regulator->isRunning());
}

TEST_F(HeaterCfgProtocolTest, StopReturnsOkAndStopsRegulator) {
  regulator->start();
  EXPECT_TRUE(regulator->isRunning());
  EXPECT_EQ(protocol->handle("STOP"), "OK");
  EXPECT_FALSE(regulator->isRunning());
}

// SP? tests
TEST_F(HeaterCfgProtocolTest, SpQueryReturnsSetpoint) {
  regulator->setSetpoint(25.5f);
  EXPECT_EQ(protocol->handle("SP?"), "SP:255");
}

TEST_F(HeaterCfgProtocolTest, SpQueryReturnsDefaultSetpoint) {
  // Default setpoint is 20.0
  EXPECT_EQ(protocol->handle("SP?"), "SP:200");
}

// SP: write tests
TEST_F(HeaterCfgProtocolTest, SpWriteSetsSetpointAndRespondsOk) {
  EXPECT_EQ(protocol->handle("SP:300"), "OK");
  EXPECT_FLOAT_EQ(regulator->getSetpoint(), 30.0f);
}

TEST_F(HeaterCfgProtocolTest, SpWriteRejectsNonNumeric) {
  EXPECT_EQ(protocol->handle("SP:abc"), "ERR_SP_NUM");
}

TEST_F(HeaterCfgProtocolTest, SpWriteRejectsOutOfRange) {
  EXPECT_EQ(protocol->handle("SP:-10"), "ERR_SP_NUM");
  EXPECT_EQ(protocol->handle("SP:600"), "ERR_SP_RANGE");
}

TEST_F(HeaterCfgProtocolTest, StatusQueryReturnsStatus) {
  sensor->temperature = 22.5f;
  regulator->setSetpoint(25.0f);
  regulator->start();

  std::string status = protocol->handle("STATUS?");
  EXPECT_EQ(status, "STATUS:T=225;SP=250;RUN=1");
}

TEST_F(HeaterCfgProtocolTest, StatusQueryWhenStopped) {
  sensor->temperature = 20.0f;
  regulator->setSetpoint(20.0f);

  std::string status = protocol->handle("STATUS?");
  EXPECT_EQ(status, "STATUS:T=200;SP=200;RUN=0");
}

// Unknown command tests
TEST_F(HeaterCfgProtocolTest, UnknownCommandReturnsEmptyString) {
  EXPECT_EQ(protocol->handle("PING"), "");
  EXPECT_EQ(protocol->handle("INVALID"), "");
}
