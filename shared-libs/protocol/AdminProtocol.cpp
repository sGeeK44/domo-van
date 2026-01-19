#include "AdminProtocol.h"
#include "Check.h"
#include <string>

namespace {
constexpr const char *ACK_OK = "OK";
constexpr const char *ERR_UNKNOWN_CMD = "ERR_UNKNOWN_CMD";
constexpr const char *ERR_PIN_LEN = "ERR_PIN_LEN";
constexpr const char *ERR_PIN_NUM = "ERR_PIN_NUM";
constexpr const char *ERR_NAME_LEN = "ERR_NAME_LEN";
constexpr const char *ERR_NAME_CHARS = "ERR_NAME_CHARS";
} // namespace

AdminProtocol::AdminProtocol(AdminSettings *settings) : _settings(settings) {}

std::string AdminProtocol::handle(std::string rx) {
  if (startsWith(rx, "PIN:")) {
    const std::string newPinStr = rx.substr(4);

    if (newPinStr.size() != 6) {
      return ERR_PIN_LEN;
    }

    if (!isNumeric(newPinStr)) {
      return ERR_PIN_NUM;
    }

    _settings->setPinCode(std::stoi(newPinStr));
    return ACK_OK;
  }

  if (startsWith(rx, "NAME:")) {
    const std::string newName = rx.substr(5);

    if (newName.size() < 1 || newName.size() > 20) {
      return ERR_NAME_LEN;
    }

    if (!isAlphaNumericSentence(newName)) {
      return ERR_NAME_CHARS;
    }

    _settings->setDeviceName(newName);
    return ACK_OK;
  }

  return ERR_UNKNOWN_CMD;
}
