#include "TemperatureRegulator.h"
#include "../FakeSettings.h"
#include "../MockStream.h"
#include <ArduinoFake.h>
#include <gtest/gtest.h>

using namespace fakeit;

// Mock TemperatureSensor
class MockTemperatureSensor : public TemperatureSensor {
public:
  float temperature = 20.0f;
  float read() override { return temperature; }
};

// Mock Fan
class MockFan : public Fan {
public:
  int speed = 0;
  void setSpeed(int s) override { speed = s; }
};

class TemperatureRegulatorTest : public ::testing::Test {
protected:
  MockTemperatureSensor *sensor;
  MockFan *fan;
  FakeSettings *settings;
  MockStream logStream;
  Logger *logger;
  TemperatureRegulator *regulator;

  void SetUp() override {
    sensor = new MockTemperatureSensor();
    fan = new MockFan();
    settings = new FakeSettings();
    logStream.reset();
    logger = new Logger(logStream, Logger::DEBUG);

    settings->int_values["heater_kp"] = 1000;
    settings->int_values["heater_ki"] = 10;
    settings->int_values["heater_kd"] = 50;

    When(Method(ArduinoFake(), millis)).AlwaysReturn(1000);
    regulator = new TemperatureRegulator(sensor, fan, settings, logger);
  }

  void TearDown() override {
    delete regulator;
    delete logger;
    delete settings;
    delete fan;
    delete sensor;
  }
};

TEST_F(TemperatureRegulatorTest, SetpointCanBeSet) {
  regulator->setSetpoint(25.0f);
  EXPECT_FLOAT_EQ(25.0f, regulator->getSetpoint());
}

TEST_F(TemperatureRegulatorTest, FanSpeedIncreasesWhenTemperatureBelowSetpoint) {
  sensor->temperature = 15.0f;
  regulator->setSetpoint(25.0f);
  regulator->start();
  regulator->update();
  EXPECT_GT(fan->speed, 0);
}

TEST_F(TemperatureRegulatorTest, FanSpeedIsZeroWhenTemperatureAboveSetpoint) {
  sensor->temperature = 30.0f;
  regulator->setSetpoint(20.0f);
  regulator->update();
  EXPECT_EQ(0, fan->speed);
}

TEST_F(TemperatureRegulatorTest, FanSpeedIsZeroWhenAtSetpoint) {
  sensor->temperature = 20.0f;
  regulator->setSetpoint(20.0f);
  regulator->update();
  EXPECT_EQ(0, fan->speed);
}

TEST_F(TemperatureRegulatorTest, OutputIsClampedToMax255) {
  sensor->temperature = 0.0f;
  regulator->setSetpoint(50.0f);
  regulator->start();
  regulator->update();
  EXPECT_EQ(255, fan->speed);
}

TEST_F(TemperatureRegulatorTest, OutputIsClampedToMin0) {
  sensor->temperature = 50.0f;
  regulator->setSetpoint(0.0f);
  regulator->update();
  EXPECT_EQ(0, fan->speed);
}

TEST_F(TemperatureRegulatorTest, IntegralAccumulatesOverTime) {
  sensor->temperature = 19.0f;
  regulator->setSetpoint(20.0f);
  regulator->update();
  int firstSpeed = fan->speed;
  regulator->update();
  regulator->update();
  regulator->update();
  int laterSpeed = fan->speed;
  EXPECT_GE(laterSpeed, firstSpeed);
}

TEST_F(TemperatureRegulatorTest, DerivativeRespondsToRapidChange) {
  settings->int_values["heater_kd"] = 500;
  settings->int_values["heater_kp"] = 0;
  settings->int_values["heater_ki"] = 0;
  sensor->temperature = 20.0f;
  regulator->setSetpoint(20.0f);
  regulator->start();
  regulator->update();
  sensor->temperature = 15.0f;
  regulator->update();
  EXPECT_GT(fan->speed, 0);
}

TEST_F(TemperatureRegulatorTest, UsesSettingsForPIDGains) {
  settings->int_values["heater_kp"] = 2000;
  settings->int_values["heater_ki"] = 0;
  settings->int_values["heater_kd"] = 0;
  sensor->temperature = 19.0f;
  regulator->setSetpoint(20.0f);
  regulator->start();
  regulator->update();
  EXPECT_EQ(20, fan->speed);
}
