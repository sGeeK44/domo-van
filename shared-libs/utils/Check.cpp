#include "Check.h"
#include <cctype>

bool isNumeric(const std::string &str) {
  if (str.empty())
    return false;

  for (unsigned char c : str) {
    if (!std::isdigit(c)) {
      return false;
    }
  }

  return true;
}

bool isAlphaNumericSentence(const std::string &str) {
  if (str.empty())
    return false;

  for (unsigned char c : str) {
    if (!(std::isalnum(c) || c == ' ' || c == '-' || c == '_')) {
      return false;
    }
  }
  return true;
}

bool startsWith(const std::string &s, const char *prefix) {
  const size_t prefixLen = std::strlen(prefix);
  return s.size() >= prefixLen && s.compare(0, prefixLen, prefix) == 0;
}

bool isStrictPositiveInt(const std::string &s) {
  if (!isNumeric(s))
    return false;

  long long value = 0;
  for (unsigned char c : s) {
    value = value * 10 + (c - '0');
    if (value > 2147483647LL) {
      return false;
    }
  }

  return value >= 0;
}