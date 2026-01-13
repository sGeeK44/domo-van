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