#include "TankSettings.h"
#include <gtest/gtest.h>
#include <map>
#include <string>

namespace {
class FakeSettings : public Settings {
public:
  // Minimal stubs (not used by these tests)
  std::string getDeviceName() override { return "X"; }
  void setDeviceName(std::string) override {}
  uint32_t getPinCode() override { return 0; }
  void setPinCode(uint32_t) override {}

  // store per-prefix values
  int getTankVolumeLiters(const char *prefix) override {
    lastPrefix = prefix;
    return volumes[std::string(prefix)];
  }
  void setTankVolumeLiters(const char *prefix, int liters) override {
    lastPrefix = prefix;
    volumes[std::string(prefix)] = liters;
  }
  int getTankHeightMm(const char *prefix) override {
    lastPrefix = prefix;
    return heights[std::string(prefix)];
  }
  void setTankHeightMm(const char *prefix, int heightMm) override {
    lastPrefix = prefix;
    heights[std::string(prefix)] = heightMm;
  }

  std::string lastPrefix;
  std::map<std::string, int> volumes;
  std::map<std::string, int> heights;
};
} // namespace

TEST(TankSettings, AdjustNameMapsCleanFrenchAndEnglish) {
  FakeSettings settings;
  TankSettings tank(&settings, std::string("clean_tank"));
  tank.setVolumeLiters(123);
  EXPECT_EQ(settings.lastPrefix, "clean_tank");
}

TEST(TankSettings, AdjustNameMapsGreyFrenchAndEnglish) {
  FakeSettings settings;
  TankSettings tank(&settings, std::string("grey_tank"));
  tank.setHeightMm(456);
  EXPECT_EQ(settings.lastPrefix, "grey_tank");
}

TEST(TankSettings, FromNameUsesExpectedPrefixWithSettingsCalls) {
  FakeSettings settings;
  TankSettings tank(&settings, std::string("any_name"));

  tank.setVolumeLiters(111);
  tank.setHeightMm(222);
  EXPECT_EQ(settings.volumes["any_name"], 111);
  EXPECT_EQ(settings.heights["any_name"], 222);
}

