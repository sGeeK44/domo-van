#pragma once
#include <WString.h>

class Settings {
public:
  virtual int get(const char *key, const int defaultValue) = 0;
  virtual void save(const char *key, const int value) = 0;
  virtual String get(const char *key, const String defaultValue) = 0;
  virtual void save(const char *key, const char *value) = 0;
};