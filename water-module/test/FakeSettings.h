#include "Settings.h"
#include <map>
#include <string>

class FakeSettings : public Settings {

public:
  int get(const char *key, const int defaultValue) override {
    auto it = int_values.find(std::string(key));
    if (it != int_values.end()) {
      return it->second;
    }
    return defaultValue;
  }
  void save(const char *key, int value) override { int_values[std::string(key)] = value; }
  std::string get(const char *key, const std::string defaultValue) override {
    auto it = str_values.find(std::string(key));
    if (it != str_values.end()) {
      return it->second;
    }
    return defaultValue;
  }
  void save(const char *key, const char *value) override { str_values[std::string(key)] = value; }

  std::map<std::string, int> int_values;
  std::map<std::string, std::string> str_values;
};