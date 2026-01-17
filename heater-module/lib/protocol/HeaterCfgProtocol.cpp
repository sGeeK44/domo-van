#include "HeaterCfgProtocol.h"
#include "Check.h"
#include <algorithm>
#include <cctype>
#include <cstdlib>
#include <string>

HeaterCfgProtocol::HeaterCfgProtocol(HeaterSettings *heaterSettings, TemperatureRegulator *regulator)
    : _heaterSettings(heaterSettings), _regulator(regulator) {}

std::string HeaterCfgProtocol::extractValue(const std::string &cmd, const char *key) {
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

std::string HeaterCfgProtocol::handle(std::string rx) {
  // CFG? - Read PID configuration
  if (rx == "CFG?") {
    const int kp = _heaterSettings->getKp();
    const int ki = _heaterSettings->getKi();
    const int kd = _heaterSettings->getKd();
    return std::string("CFG:KP=") + std::to_string(kp) + ";KI=" + std::to_string(ki) + ";KD=" + std::to_string(kd);
  }

  // CFG:KP=...;KI=...;KD=... - Write PID configuration
  if (startsWith(rx, "CFG:")) {
    std::string kpStr = extractValue(rx, "KP");
    std::string kiStr = extractValue(rx, "KI");
    std::string kdStr = extractValue(rx, "KD");

    if (kpStr.empty() || kiStr.empty() || kdStr.empty()) {
      return "ERR_CFG_FMT";
    }

    if (!isStrictPositiveInt(kpStr) || !isStrictPositiveInt(kiStr) || !isStrictPositiveInt(kdStr)) {
      return "ERR_CFG_NUM";
    }

    const int kp = std::stoi(kpStr);
    const int ki = std::stoi(kiStr);
    const int kd = std::stoi(kdStr);

    // Sanity bounds: 0 < value <= 10000 (0.01 to 100.0 when divided by 100)
    if (kp <= 0 || kp > 10000 || ki <= 0 || ki > 10000 || kd <= 0 || kd > 10000) {
      return "ERR_CFG_RANGE";
    }

    _heaterSettings->setKp(kp);
    _heaterSettings->setKi(ki);
    _heaterSettings->setKd(kd);
    return "OK";
  }

  // START - Start the regulator
  if (rx == "START") {
    _regulator->start();
    return "OK";
  }

  // STOP - Stop the regulator
  if (rx == "STOP") {
    _regulator->stop();
    return "OK";
  }

  // SP? - Read setpoint
  if (rx == "SP?") {
    float sp = _regulator->getSetpoint();
    int spInt = static_cast<int>(sp * 10); // Store as tenths of degree
    return std::string("SP:") + std::to_string(spInt);
  }

  // SP:<celsius*10> - Set setpoint (value is in tenths of degree)
  if (startsWith(rx, "SP:")) {
    std::string spStr = rx.substr(3);

    if (spStr.empty() || !isNumeric(spStr)) {
      return "ERR_SP_NUM";
    }

    const int spInt = std::stoi(spStr);

    // Sanity bounds: 0 to 50 degrees (0 to 500 in tenths)
    if (spInt < 0 || spInt > 500) {
      return "ERR_SP_RANGE";
    }

    _regulator->setSetpoint(spInt / 10.0f);
    return "OK";
  }

  // STATUS? - Get current status
  if (rx == "STATUS?") {
    float temp = _regulator->getCurrentTemp();
    float sp = _regulator->getSetpoint();
    bool running = _regulator->isRunning();

    int tempInt = static_cast<int>(temp * 10);
    int spInt = static_cast<int>(sp * 10);

    return std::string("STATUS:T=") + std::to_string(tempInt) + ";SP=" + std::to_string(spInt) +
           ";RUN=" + (running ? "1" : "0");
  }

  // Not a recognized command
  return "";
}
