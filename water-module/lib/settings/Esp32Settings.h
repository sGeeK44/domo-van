#include "Settings.h"
#include <Preferences.h>

class Esp32Settings : public Settings {
  Preferences prefs;
  const char *_nameSpace;
  int get(const char *key, const int defaultValue);
  void save(const char *key, const int value);
  String get(const char *key, const String defaultValue);
  void save(const char *key, const char *value);

public:
  Esp32Settings(const char *nameSpace) : _nameSpace(nameSpace) {}
  String getDeviceName() override;
  void setDeviceName(String newName) override;
  uint32_t getPinCode() override;
  void setPinCode(uint32_t newPin) override;
};