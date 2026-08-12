// react-native ships Flow source that Vite cannot parse, so tests resolve it
// to this stub through the alias in vitest.config.ts.

export const Platform = { OS: "android", Version: 31 };

export const PermissionsAndroid = {
  PERMISSIONS: {
    BLUETOOTH_SCAN: "android.permission.BLUETOOTH_SCAN",
    BLUETOOTH_CONNECT: "android.permission.BLUETOOTH_CONNECT",
    ACCESS_FINE_LOCATION: "android.permission.ACCESS_FINE_LOCATION",
  },
  RESULTS: { GRANTED: "granted", DENIED: "denied" },
  request: async () => "granted",
  requestMultiple: async () => ({}),
};
