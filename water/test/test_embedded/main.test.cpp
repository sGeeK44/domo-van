#include "Program.h"
#include "SensorBase.h"
#include <Arduino.h>
#include <unity.h>

// Mock Sensor for testing
class MockSensor : public Sensor {
public:
  int valueToReturn = 100;
  int maxRangeToReturn = 1000;

  int read() override { return valueToReturn; }
  int maxRange() override { return maxRangeToReturn; }
};

static Program *program = nullptr;
static MockSensor *mockSensor = nullptr;

void test_setup_initializes_correctly() {
  mockSensor = new MockSensor();
  program = new Program(Serial, Serial2, mockSensor);
  program->setup();
  TEST_ASSERT_NOT_NULL(program);
}

void setup() {
  delay(1000);
  UNITY_BEGIN();
  RUN_TEST(test_setup_initializes_correctly);
  UNITY_END();
}

void loop() {}
