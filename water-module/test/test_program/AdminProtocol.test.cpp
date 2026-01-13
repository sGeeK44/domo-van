#include "AdminProtocol.h"
#include "../FakeSettings.h"
#include <gtest/gtest.h>
#include <string>

TEST(AdminProtocol, PinWritePersistsAndRespondsOk) {
  FakeSettings s;
  AdminSettings adminSettings(&s);
  AdminProtocol p(&adminSettings);

  EXPECT_EQ(p.handle("PIN:123456"), "OK");
  EXPECT_EQ(s.int_values["pin_code"], 123456);
}

TEST(AdminProtocol, PinWriteRejectsWrongLength) {
  FakeSettings s;
  AdminSettings adminSettings(&s);
  AdminProtocol p(&adminSettings);

  EXPECT_EQ(p.handle("PIN:12345"), "ERR_PIN_LEN");
  EXPECT_EQ(p.handle("PIN:1234567"), "ERR_PIN_LEN");
}

TEST(AdminProtocol, PinWriteRejectsNonNumeric) {
  FakeSettings s;
  AdminSettings adminSettings(&s);
  AdminProtocol p(&adminSettings);

  EXPECT_EQ(p.handle("PIN:12ab56"), "ERR_PIN_NUM");
}

TEST(AdminProtocol, NameWritePersistsAndRespondsOk) {
  FakeSettings s;
  AdminSettings adminSettings(&s);
  AdminProtocol p(&adminSettings);

  EXPECT_EQ(p.handle("NAME:My_Water-Tank 1"), "OK");
  EXPECT_EQ(s.str_values["device_name"], "My_Water-Tank 1");
}

TEST(AdminProtocol, NameWriteRejectsEmptyAndTooLong) {
  FakeSettings s;
  AdminSettings adminSettings(&s);
  AdminProtocol p(&adminSettings);

  EXPECT_EQ(p.handle("NAME:"), "ERR_NAME_LEN");
  EXPECT_EQ(p.handle("NAME:123456789012345678901"), "ERR_NAME_LEN");
}

TEST(AdminProtocol, NameWriteRejectsInvalidChars) {
  FakeSettings s;
  AdminSettings adminSettings(&s);
  AdminProtocol p(&adminSettings);

  EXPECT_EQ(p.handle("NAME:Bad!Name"), "ERR_NAME_CHARS");
}

TEST(AdminProtocol, UnknownCommandReturnsErrUnknown) {
  FakeSettings s;
  AdminSettings adminSettings(&s);
  AdminProtocol p(&adminSettings);

  EXPECT_EQ(p.handle("PING"), "ERR_UNKNOWN_CMD");
}

