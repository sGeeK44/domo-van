// react-native-ble-plx ships Flow-typed source that Vite cannot parse, so
// tests resolve it to this stub through the alias in vitest.config.ts.

export class BleManager {
  /** `new BleManager()` calls `BleModule.createClient()` on a real device. */
  static clientsCreated = 0;

  constructor() {
    BleManager.clientsCreated += 1;
  }
}
