#include "InputSignal.h"
#include "EmaFilter.h"
#include "MedianFilter.h"
#include <gtest/gtest.h>

// Mock Sensor for testing
class MockSensor : public Sensor {
public:
  int valueToReturn = 100;
  int maxRangeToReturn = 1000;

  int read() override { return valueToReturn; }
  int maxRange() override { return maxRangeToReturn; }
};

TEST(InputSignalTest, ReadReturnsSensorValueWhenValid) {
  MockSensor sensor;
  InputSignal input(&sensor);

  int result = input.read();
  EXPECT_EQ(100, result);
}

TEST(InputSignalTest, ReadReturnsLastValidWhenSensorInvalid) {
  MockSensor sensor;
  InputSignal input(&sensor);

  input.read();
  sensor.valueToReturn = -1;
  int result = input.read();
  EXPECT_EQ(100, result);
}

TEST(InputSignalTest, ReadReturnsLastValidWhenOverMaxRange) {
  MockSensor sensor;
  InputSignal input(&sensor);

  input.read();
  sensor.valueToReturn = 1500;
  int result = input.read();
  EXPECT_EQ(100, result);
}

TEST(InputSignalTest, ReadReturnsMinusOneWhenFirstReadingIsInvalid) {
  MockSensor sensor;
  InputSignal input(&sensor);

  sensor.valueToReturn = -1;
  int result = input.read();
  EXPECT_EQ(-1, result);
}

TEST(InputSignalTest, AppliesFilters) {
  MockSensor sensor;
  InputSignal input(&sensor);
  EmaFilter ema(0.5);
  input.addFilter(&ema);

  sensor.valueToReturn = 200;
  int result = input.read();
  EXPECT_EQ(200, result);

  sensor.valueToReturn = 400;
  result = input.read();
  EXPECT_EQ(300, result);
}

TEST(InputSignalTest, AppliesMultipleFilters) {
  MockSensor sensor;
  InputSignal input(&sensor);
  MedianFilter median(3);
  input.addFilter(&median);

  sensor.valueToReturn = 10;
  EXPECT_EQ(10, input.read());

  sensor.valueToReturn = 20;
  EXPECT_EQ(10, input.read());

  sensor.valueToReturn = 30;
  EXPECT_EQ(20, input.read());
}