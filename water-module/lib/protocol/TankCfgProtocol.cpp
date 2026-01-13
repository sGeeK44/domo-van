#include "TankCfgProtocol.h"
#include "Check.h"
#include <algorithm>
#include <cctype>
#include <string>

TankCfgProtocol::TankCfgProtocol(TankSettings *tankSettings) : _tankSettings(tankSettings) {}

std::string TankCfgProtocol::extractValue(const std::string &cmd, const char *key) {
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

std::string TankCfgProtocol::handle(std::string rx) {
  if (rx == "CFG?") {
    const int v = _tankSettings->getVolumeLiters();
    const int h = _tankSettings->getHeightMm();
    return std::string("CFG:V=") + std::to_string(v) + ";H=" + std::to_string(h);
  }

  if (startsWith(rx, "CFG:")) {
    std::string vStr = extractValue(rx, "V");
    std::string hStr = extractValue(rx, "H");

    if (vStr.empty() || hStr.empty()) {
      return "ERR_CFG_FMT";
    }

    if (!isStrictPositiveInt(vStr) || !isStrictPositiveInt(hStr)) {
      return "ERR_CFG_NUM";
    }

    const int v = std::stoi(vStr);
    const int h = std::stoi(hStr);

    // Keep loose sanity bounds.
    if (v <= 0 || v > 5000 || h <= 0 || h > 10000) {
      return "ERR_CFG_RANGE";
    }

    _tankSettings->setVolumeLiters(v);
    _tankSettings->setHeightMm(h);
    return "OK";
  }

  return "ERR_UNKNOWN_CMD";
}
