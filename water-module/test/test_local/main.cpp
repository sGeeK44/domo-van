#include <Arduino.h>
#include <gtest/gtest.h>

// --- Main Entry Point ---
int main(int argc, char **argv) {
  ::testing::InitGoogleTest(&argc, argv);
  return RUN_ALL_TESTS();
}
