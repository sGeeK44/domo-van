#include "Settings.h"
#include <Preferences.h>

class Esp32Settings : public Settings {
  Preferences prefs;
  const char *_nameSpace;

public:
  Esp32Settings(const char *nameSpace) : _nameSpace(nameSpace) {}
  int get(const char *key, const int defaultValue) override;
  void save(const char *key, const int value) override;
  String get(const char *key, const String defaultValue) override;
  void save(const char *key, const char *value) override;
};