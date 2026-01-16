#include "ValveCfgProtocol.h"
#include "Check.h"
#include <algorithm>
#include <cctype>
#include <string>

ValveCfgProtocol::ValveCfgProtocol(ValveSettings *valveSettings) : _valveSettings(valveSettings) {}

std::string ValveCfgProtocol::extractValue(const std::string &cmd, const char *key) {
  const std::string needle = std::string(key) + "=";
  const size_t pos = cmd.find(needle);
  if (pos == std::string::npos)
    return "";
  const size_t start = pos + needle.length();
  const size_t end = cmd.find(';', start);
  if (end == std::string::npos)
    return cmd.substr(start);
  return cmd.substr(start, end - start);
}

std::string ValveCfgProtocol::handle(std::string rx) {
  if (rx == "CFG?") {
    const int t = _valveSettings->getAutoCloseSeconds();
    return std::string("CFG:T=") + std::to_string(t);
  }

  if (startsWith(rx, "CFG:")) {
    std::string tStr = extractValue(rx, "T");

    if (tStr.empty()) {
      return "ERR_CFG_FMT";
    }

    if (!isStrictPositiveInt(tStr)) {
      return "ERR_CFG_NUM";
    }

    const int t = std::stoi(tStr);

    // Keep loose sanity bounds (1 second to 5 minutes).
    if (t <= 0 || t > 300) {
      return "ERR_CFG_RANGE";
    }

    _valveSettings->setAutoCloseSeconds(t);
    return "OK";
  }

  // Not a config command - return empty to indicate not handled
  return "";
}
