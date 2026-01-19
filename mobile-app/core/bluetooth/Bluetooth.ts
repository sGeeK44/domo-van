import { PermissionsAndroid, Platform } from "react-native";
import { BleManager, Device } from "react-native-ble-plx";
import { buildServiceUuid } from "./BleUuid";

export interface DiscoveredBluetoothDevice {
  id: string;
  name: string;
}

export class Bluetooth {
  constructor(private readonly BleManager: BleManager) {}

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
    serviceId: string,
    onDeviceFound: (device: DiscoveredBluetoothDevice) => void,
  ): Promise<void> {
    const ok = await this.ensureBlePermissionsAndroid();
    if (!ok) {
      throw new Error("Bluetooth permissions not granted.");
    }

    const serviceUuid = buildServiceUuid(serviceId);
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

  public async connect(deviceId: string): Promise<Device> {
    let device = await this.BleManager.connectToDevice(deviceId, {
      autoConnect: false,
      timeout: 10000,
    });
    if (Platform.OS === "android") {
      device = await device.requestMTU(185);
    }

    return device;
  }
}
