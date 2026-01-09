#include "Check.h"
#include <Arduino.h>

bool isNumeric(String str) {
  if (str.length() == 0)
    return false;

  for (size_t i = 0; i < str.length(); i++) {
    if (!isDigit(str.charAt(i))) {
      return false;
    }
  }

  return true;
}

bool isAlphaNumericSentence(String str) {
  if (str == nullptr)
    return false;

  for (size_t i = 0; i < str.length(); i++) {
    char c = str.charAt(i);

    if (!(isAlphaNumeric(c) || c == ' ' || c == '-' || c == '_')) {
      return false;
    }
  }
  return true;
}