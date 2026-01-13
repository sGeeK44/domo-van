#include "TankSettings.h"
#include "../FakeSettings.h"
#include <gtest/gtest.h>
#include <map>
#include <string>

TEST(TankSettings, FromNameUsesExpectedPrefixWithSettingsCalls) {
  FakeSettings settings;
  TankSettings tank(&settings, std::string("any_name"));

  tank.setVolumeLiters(111);
  tank.setHeightMm(222);
  EXPECT_EQ(settings.int_values["any_name_v_l"], 111);
  EXPECT_EQ(settings.int_values["any_name_h_mm"], 222);
}
