#include "AdminProtocol.h"
#include "Check.h"
#include <cstring>
#include <string>

namespace {
constexpr const char *ACK_OK = "OK";
constexpr const char *ERR_UNKNOWN_CMD = "ERR_UNKNOWN_CMD";
constexpr const char *ERR_PIN_LEN = "ERR_PIN_LEN";
constexpr const char *ERR_PIN_NUM = "ERR_PIN_NUM";
constexpr const char *ERR_NAME_LEN = "ERR_NAME_LEN";
constexpr const char *ERR_NAME_CHARS = "ERR_NAME_CHARS";
constexpr const char *ERR_ID_FMT = "ERR_ID_FMT";

constexpr size_t PIN_DIGITS = 6;
constexpr size_t MAX_NAME_LENGTH = 20;
constexpr const char *NAME_FIELD = "NAME=";
constexpr const char *PIN_FIELD = ";PIN=";

const char *nameError(const std::string &name) {
  if (name.size() < 1 || name.size() > MAX_NAME_LENGTH) {
    return ERR_NAME_LEN;
  }
  if (!isAlphaNumericSentence(name)) {
    return ERR_NAME_CHARS;
  }
  return nullptr;
}

const char *pinError(const std::string &pin) {
  if (pin.size() != PIN_DIGITS) {
    return ERR_PIN_LEN;
  }
  if (!isNumeric(pin)) {
    return ERR_PIN_NUM;
  }
  return nullptr;
}
} // namespace

AdminProtocol::AdminProtocol(AdminSettings *settings) : _settings(settings) {}

std::string AdminProtocol::handleIdentity(const std::string &body) {
  if (!startsWith(body, NAME_FIELD)) {
    return ERR_ID_FMT;
  }

  const size_t nameAt = std::strlen(NAME_FIELD);
  const size_t pinAt = body.find(PIN_FIELD);
  if (pinAt == std::string::npos) {
    return ERR_ID_FMT;
  }

  const std::string name = body.substr(nameAt, pinAt - nameAt);
  const std::string pin = body.substr(pinAt + std::strlen(PIN_FIELD));

  if (const char *error = nameError(name)) {
    return error;
  }
  if (const char *error = pinError(pin)) {
    return error;
  }

  _settings->setDeviceName(name);
  _settings->setPinCode(std::stoi(pin));
  return ACK_OK;
}

std::string AdminProtocol::handle(std::string rx) {
  if (startsWith(rx, "ID:")) {
    return handleIdentity(rx.substr(3));
  }

  if (startsWith(rx, "PIN:")) {
    const std::string newPinStr = rx.substr(4);

    if (const char *error = pinError(newPinStr)) {
      return error;
    }

    _settings->setPinCode(std::stoi(newPinStr));
    return ACK_OK;
  }

  if (startsWith(rx, "NAME:")) {
    const std::string newName = rx.substr(5);

    if (const char *error = nameError(newName)) {
      return error;
    }

    _settings->setDeviceName(newName);
    return ACK_OK;
  }

  return ERR_UNKNOWN_CMD;
}
