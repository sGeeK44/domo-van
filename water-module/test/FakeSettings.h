#include "Settings.h"
#include <map>
#include <string>

class FakeSettings : public Settings {

public:
  int get(const char *key, const int defaultValue) override { return int_values[std::string(key)]; }
  void save(const char *key, int value) override { int_values[std::string(key)] = value; }
  std::string get(const char *key, const std::string defaultValue) override { return str_values[std::string(key)]; }
  void save(const char *key, const char *value) override { str_values[std::string(key)] = value; }

  std::map<std::string, int> int_values;
  std::map<std::string, std::string> str_values;
};