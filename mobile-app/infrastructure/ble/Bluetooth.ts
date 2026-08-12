import { PermissionsAndroid, Platform } from "react-native";
import { BleManager } from "react-native-ble-plx";
import type { Unsubscribe } from "@/core/observable";
import type {
  BluetoothScanner,
  DiscoveredBluetoothDevice,
} from "@/domain/ports/BluetoothScanner";
import type { DeviceConnector } from "@/domain/ports/DeviceConnector";
import type { DeviceHandle } from "@/domain/ports/DeviceHandle";
import type { BleConnections } from "@/infrastructure/ble/BleConnections";

export class Bluetooth implements BluetoothScanner, DeviceConnector {
  constructor(
    private readonly BleManager: BleManager,
    private readonly connections: BleConnections,
  ) {}

  private async ensureBlePermissionsAndroid(): Promise<boolean> {
    if (Platform.OS !== "android") return true;

    const apiLevel =
      typeof Platform.Version === "number" ? Platform.Version : Number.NaN;

    try {
      if (Number.isFinite(apiLevel) && apiLevel >= 31) {
        const res = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        ]);
        return (
          res[PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN] ===
            PermissionsAndroid.RESULTS.GRANTED &&
          res[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT] ===
            PermissionsAndroid.RESULTS.GRANTED
        );
      }

      const res = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      );
      return res === PermissionsAndroid.RESULTS.GRANTED;
    } catch (e) {
      console.warn(e);
      return false;
    }
  }

  public async startScan(
    serviceUuid: string,
    onDeviceFound: (device: DiscoveredBluetoothDevice) => void,
  ): Promise<void> {
    const ok = await this.ensureBlePermissionsAndroid();
    if (!ok) {
      throw new Error("Bluetooth permissions not granted.");
    }

    this.BleManager.startDeviceScan(
      [serviceUuid],
      { allowDuplicates: false },
      (err, d) => {
        if (err) {
          throw new Error(err.message);
        }
        if (!d) return;

        onDeviceFound({ id: d.id, name: d.name ?? "NO_NAME" });
      },
    );
  }

  async stopScan(): Promise<void> {
    this.BleManager.stopDeviceScan();
  }

  public async connect(deviceId: string): Promise<DeviceHandle> {
    let device = await this.BleManager.connectToDevice(deviceId, {
      autoConnect: false,
      timeout: 10000,
    });
    if (Platform.OS === "android") {
      device = await device.requestMTU(185);
    }
    device = await device.discoverAllServicesAndCharacteristics();

    device.onDisconnected(() => this.connections.remove(device.id));
    return this.connections.add(device);
  }

  public async disconnect(handle: DeviceHandle): Promise<void> {
    const device = this.connections.find(handle);
    if (!device) return;

    try {
      await device.cancelConnection();
    } finally {
      this.connections.remove(handle.id);
    }
  }

  public onDisconnected(
    handle: DeviceHandle,
    listener: () => void,
  ): Unsubscribe {
    const subscription = this.connections
      .find(handle)
      ?.onDisconnected(listener);
    return () => subscription?.remove();
  }
}

/** Builds the BLE stack. The `BleManager` must exist exactly once per app. */
export function createBluetooth(connections: BleConnections): Bluetooth {
  return new Bluetooth(new BleManager(), connections);
}
