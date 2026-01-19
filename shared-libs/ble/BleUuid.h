#pragma once
#include <string>

#define BLE_UUID_ROOT "b1f8707e"

inline std::string buildServiceUuid(const char *serviceId) {
  return std::string(BLE_UUID_ROOT) + "-" + serviceId + "-0000-0000-000000000000";
}

inline std::string buildTxUuid(const char *serviceId, const char *channelId) {
  return std::string(BLE_UUID_ROOT) + "-" + serviceId + "-" + channelId + "-0000-000000000000";
}

inline std::string buildRxUuid(const char *serviceId, const char *channelId) {
  return std::string(BLE_UUID_ROOT) + "-" + serviceId + "-" + channelId + "-0000-000000000001";
}
