#include "TankCfgProtocol.h"
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

  int getTankVolumeLiters(const char *prefix) override { return volumes[std::string(prefix)]; }
  void setTankVolumeLiters(const char *prefix, int liters) override { volumes[std::string(prefix)] = liters; }
  int getTankHeightMm(const char *prefix) override { return heights[std::string(prefix)]; }
  void setTankHeightMm(const char *prefix, int heightMm) override { heights[std::string(prefix)] = heightMm; }

  std::map<std::string, int> volumes;
  std::map<std::string, int> heights;
};
} // namespace

TEST(TankCfgProtocol, CfgQueryRespondsWithCurrentValues) {
  FakeSettings s;
  s.volumes["clean"] = 150;
  s.heights["clean"] = 900;

  TankSettings tankSettings(&s, std::string("clean"));
  TankCfgProtocol p(&tankSettings);
  EXPECT_EQ(p.handle("CFG?"), "CFG:V=150;H=900");
}

TEST(TankCfgProtocol, CfgWritePersistsAndRespondsOk) {
  FakeSettings s;
  TankSettings tankSettings(&s, std::string("grey"));
  TankCfgProtocol p(&tankSettings);

  EXPECT_EQ(p.handle("CFG:V=123;H=456"), "OK");
  EXPECT_EQ(s.volumes["grey"], 123);
  EXPECT_EQ(s.heights["grey"], 456);
}

TEST(TankCfgProtocol, CfgWriteRejectsMissingFields) {
  FakeSettings s;
  TankSettings tankSettings(&s, std::string("clean"));
  TankCfgProtocol p(&tankSettings);

  EXPECT_EQ(p.handle("CFG:V=100"), "ERR_CFG_FMT");
  EXPECT_EQ(p.handle("CFG:H=200"), "ERR_CFG_FMT");
}

TEST(TankCfgProtocol, CfgWriteRejectsNonNumeric) {
  FakeSettings s;
  TankSettings tankSettings(&s, std::string("clean"));
  TankCfgProtocol p(&tankSettings);

  EXPECT_EQ(p.handle("CFG:V=abc;H=100"), "ERR_CFG_NUM");
  EXPECT_EQ(p.handle("CFG:V=100;H=-1"), "ERR_CFG_NUM");
}

TEST(TankCfgProtocol, CfgWriteRejectsOutOfRange) {
  FakeSettings s;
  TankSettings tankSettings(&s, std::string("clean"));
  TankCfgProtocol p(&tankSettings);

  EXPECT_EQ(p.handle("CFG:V=0;H=100"), "ERR_CFG_RANGE");
  EXPECT_EQ(p.handle("CFG:V=100;H=0"), "ERR_CFG_RANGE");
  EXPECT_EQ(p.handle("CFG:V=999999;H=100"), "ERR_CFG_RANGE");
  EXPECT_EQ(p.handle("CFG:V=100;H=999999"), "ERR_CFG_RANGE");
}

TEST(TankCfgProtocol, UnknownCommandReturnsErrUnknown) {
  FakeSettings s;
  TankSettings tankSettings(&s, std::string("clean"));
  TankCfgProtocol p(&tankSettings);

  EXPECT_EQ(p.handle("PING"), "ERR_UNKNOWN_CMD");
}
