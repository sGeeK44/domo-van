#pragma once
#include <cstdint>
#include <string>

class Settings {
public:
  virtual int get(const char *key, const int defaultValue) = 0;
  virtual void save(const char *key, const int value) = 0;
  virtual std::string get(const char *key, const std::string defaultValue) = 0;
  virtual void save(const char *key, const char *value) = 0;
};