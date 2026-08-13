export interface DiscoveredBluetoothDevice {
  id: string;
  name: string;
  /** Services carried by the advertisement — how a scan result is typed. */
  serviceUuids: readonly string[];
}

/**
 * Discovers devices advertising any of the given services. Connecting to one
 * of them is a transport concern and stays out of this port.
 */
export interface BluetoothScanner {
  startScan(
    serviceUuids: readonly string[],
    onDeviceFound: (device: DiscoveredBluetoothDevice) => void,
  ): Promise<void>;
  stopScan(): Promise<void>;
}
