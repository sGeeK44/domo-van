import type { Bluetooth } from "@/core/bluetooth/Bluetooth";
import { DeviceStorage } from "@/hooks/DeviceStorage";
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { Device, Subscription } from "react-native-ble-plx";

export type ConnectedDeviceContextValue = {
  device: Device | null;
  isConnected: boolean;
  isConnecting: boolean;
  lastDeviceId: string | null;
  setDevice: (device: Device | null) => void;
  autoConnect: (bluetooth: Bluetooth) => Promise<void>;
};

const ConnectedDeviceContext =
  createContext<ConnectedDeviceContextValue | null>(null);

export function ConnectedDeviceProvider({ children }: PropsWithChildren) {
  const [device, setDeviceState] = useState<Device | null>(null);
  const [lastDeviceId, setLastDeviceId] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  // Load lastDeviceId from storage on mount
  useEffect(() => {
    DeviceStorage.getLastDeviceId().then((storedId) => {
      if (storedId) {
        setLastDeviceId(storedId);
      }
    });
  }, []);

  // Wrapper to persist device ID when setting device
  const setDevice = useCallback((newDevice: Device | null) => {
    setDeviceState(newDevice);
    if (newDevice) {
      setLastDeviceId(newDevice.id);
      void DeviceStorage.setLastDeviceId(newDevice.id);
    }
  }, []);

  // Listen for disconnection
  useEffect(() => {
    if (!device) return;

    let subscription: Subscription | null = null;

    subscription = device.onDisconnected(() => {
      setDeviceState(null);
    });

    return () => {
      subscription?.remove();
    };
  }, [device]);

  // Auto-connect to the last known device
  const autoConnect = useCallback(
    async (bluetooth: Bluetooth) => {
      if (!lastDeviceId || device !== null || isConnecting) {
        return;
      }

      setIsConnecting(true);
      try {
        const connectedDevice = await bluetooth.connect(lastDeviceId);
        await connectedDevice.discoverAllServicesAndCharacteristics();
        setDevice(connectedDevice);
      } catch {
        // Silently fail - user can manually connect via settings
      } finally {
        setIsConnecting(false);
      }
    },
    [lastDeviceId, device, isConnecting, setDevice]
  );

  const value: ConnectedDeviceContextValue = {
    device,
    isConnected: device !== null,
    isConnecting,
    lastDeviceId,
    setDevice,
    autoConnect,
  };

  return (
    <ConnectedDeviceContext.Provider value={value}>
      {children}
    </ConnectedDeviceContext.Provider>
  );
}

export function useConnectedDevice(): ConnectedDeviceContextValue {
  const ctx = useContext(ConnectedDeviceContext);
  if (!ctx) {
    throw new Error(
      "useConnectedDevice must be used within a ConnectedDeviceProvider"
    );
  }
  return ctx;
}
