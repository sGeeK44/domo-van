#include "Program.h"
#include "MockStream.h"
#include <ArduinoFake.h>
#include <gtest/gtest.h>

using namespace fakeit;

class ProgramTest : public ::testing::Test {
protected:
  void SetUp() override {
    ArduinoFakeReset();
  }
};

TEST_F(ProgramTest, SetupLogsInitializationMessages) {
  Program program;
  MockStream serial;
  MockStream serial2;

  program.setup(serial, serial2);

  std::string output(serial.output.begin(), serial.output.end());
  EXPECT_NE(output.find("--- Starting water module ---"), std::string::npos);
  EXPECT_NE(output.find("--- Setup done ---"), std::string::npos);
}

TEST_F(ProgramTest, LoopLogsDistanceWhenValid) {
  Program program;
  MockStream serial;
  MockStream serial2;

  program.setup(serial, serial2);
  serial.output.clear(); // Clear setup logs

  // Prepare a valid distance packet: 0x0123 = 291mm
  // Header: 0xFF, High: 0x01, Low: 0x23, Checksum: (0xFF + 0x01 + 0x23) & 0xFF = 0x23
  serial2.addPacket(0x01, 0x23);

  When(Method(ArduinoFake(), delay)).AlwaysReturn();

  program.loop();

  std::string output(serial.output.begin(), serial.output.end());
  EXPECT_NE(output.find("Distance: 291 mm"), std::string::npos);
  Verify(Method(ArduinoFake(), delay).Using(110)).Once();
}

TEST_F(ProgramTest, LoopLogsNothingWhenSensorNotReady) {
  Program program;
  MockStream serial;
  MockStream serial2;

  program.setup(serial, serial2);
  serial.output.clear();

  // No data in serial2

  program.loop();

  std::string output(serial.output.begin(), serial.output.end());
  EXPECT_EQ(output.find("Distance:"), std::string::npos);
}

TEST_F(ProgramTest, LoopAppliesFiltering) {
  Program program;
  MockStream serial;
  MockStream serial2;

  program.setup(serial, serial2);
  When(Method(ArduinoFake(), delay)).AlwaysReturn();

  for (int i = 0; i < 3; i++) {
    serial2.addPacket(0x00, 100);
    program.loop();
    std::string output(serial.output.begin(), serial.output.end());
    EXPECT_NE(output.find("Distance: 100 mm"), std::string::npos);
  }
}

TEST_F(ProgramTest, LoopSimulatesTankFillingWithWaves) {
  Program program;
  MockStream serial;
  MockStream serial2;

  program.setup(serial, serial2);
  When(Method(ArduinoFake(), delay)).AlwaysReturn();

  int baseDistance = 800;
  int fillRate = 5; // 5mm per loop

  // Simulate 30 loops of filling
  for (int i = 0; i < 30; i++) {
    // Add "wave" noise: +/- 20mm oscillation
    int wave = (i % 4 == 0) ? 20 : (i % 4 == 2 ? -20 : 0);
    int rawDistance = baseDistance + wave;

    serial2.addPacket(rawDistance >> 8, rawDistance & 0xFF);
    program.loop();

    baseDistance -= fillRate;
  }

  // After 30 loops, base distance should be 800 - (30 * 5) = 650mm.
  // The filters (Median 9 + EMA 0.5) should have smoothed out the waves.
  std::string output(serial.output.begin(), serial.output.end());

  // Parse the last logged distance
  size_t lastPos = output.rfind("Distance: ");
  ASSERT_NE(lastPos, std::string::npos);
  size_t endPos = output.find(" mm", lastPos);
  ASSERT_NE(endPos, std::string::npos);

  std::string distanceStr = output.substr(lastPos + 10, endPos - (lastPos + 10));
  int finalDistance = std::stoi(distanceStr);

  // Filters (Median 9 + EMA 0.5) introduce lag while the value is changing.
  // With -5mm per loop:
  // - Median(9) adds 4 samples lag = 20mm
  // - EMA(0.5) adds about 1-2 samples lag = 5-10mm
  // The last raw value was 655, so we expect around 680mm.
  EXPECT_NEAR(finalDistance, 681, 5);
}

