export interface DiscoveredBluetoothDevice {
  id: string;
  name: string;
}

/**
 * Discovers devices advertising a given service. Connecting to one of them is
 * a transport concern and stays out of this port.
 */
export interface BluetoothScanner {
  startScan(
    serviceUuid: string,
    onDeviceFound: (device: DiscoveredBluetoothDevice) => void,
  ): Promise<void>;
  stopScan(): Promise<void>;
}
