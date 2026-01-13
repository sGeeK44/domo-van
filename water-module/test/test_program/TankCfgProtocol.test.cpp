#include "TankCfgProtocol.h"
#include "../FakeSettings.h"
#include <gtest/gtest.h>
#include <string>

TEST(TankCfgProtocol, CfgQueryRespondsWithCurrentValues) {
  FakeSettings s;
  s.int_values["clean_v_l"] = 150;
  s.int_values["clean_h_mm"] = 900;

  TankSettings tankSettings(&s, std::string("clean"));
  TankCfgProtocol p(&tankSettings);
  EXPECT_EQ(p.handle("CFG?"), "CFG:V=150;H=900");
}

TEST(TankCfgProtocol, CfgWritePersistsAndRespondsOk) {
  FakeSettings s;
  TankSettings tankSettings(&s, std::string("grey"));
  TankCfgProtocol p(&tankSettings);

  EXPECT_EQ(p.handle("CFG:V=123;H=456"), "OK");
  EXPECT_EQ(s.int_values["grey_v_l"], 123);
  EXPECT_EQ(s.int_values["grey_h_mm"], 456);
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
