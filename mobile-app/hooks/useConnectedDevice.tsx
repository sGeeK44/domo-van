import type { Bluetooth } from "@/core/bluetooth/Bluetooth";
import { DeviceStorage, type DeviceInfo } from "@/hooks/DeviceStorage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type PropsWithChildren,
} from "react";
import { Device, Subscription } from "react-native-ble-plx";

export type ConnectedDeviceContextValue = {
  device: Device | null;
  isConnected: boolean;
  isConnecting: boolean;
  lastDevice: DeviceInfo | null;
  setDevice: (device: Device | null) => void;
  autoConnect: (bluetooth: Bluetooth) => Promise<void>;
  forgetDevice: () => Promise<void>;
};

const ConnectedDeviceContext =
  createContext<ConnectedDeviceContextValue | null>(null);

export function ConnectedDeviceProvider({ children }: PropsWithChildren) {
  const [device, setDeviceState] = useState<Device | null>(null);
  const [lastDevice, setLastDevice] = useState<DeviceInfo | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  // Load lastDevice from storage on mount
  useEffect(() => {
    DeviceStorage.getLastDevice().then((storedDevice) => {
      if (storedDevice) {
        setLastDevice(storedDevice);
      }
    });
  }, []);

  // Wrapper to persist device info when setting device
  const setDevice = useCallback((newDevice: Device | null) => {
    setDeviceState(newDevice);
    if (newDevice) {
      const deviceInfo: DeviceInfo = {
        id: newDevice.id,
        name: newDevice.name ?? "Water Module",
      };
      setLastDevice(deviceInfo);
      void DeviceStorage.setLastDevice(deviceInfo);
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
      if (!lastDevice || device !== null || isConnecting) {
        return;
      }

      setIsConnecting(true);
      try {
        const connectedDevice = await bluetooth.connect(lastDevice.id);
        await connectedDevice.discoverAllServicesAndCharacteristics();
        setDevice(connectedDevice);
      } catch {
        // Silently fail - user can manually connect via settings
      } finally {
        setIsConnecting(false);
      }
    },
    [lastDevice, device, isConnecting, setDevice]
  );

  // Forget the saved device and disconnect if connected
  const forgetDevice = useCallback(async () => {
    if (device) {
      try {
        await device.cancelConnection();
      } catch {
        // Ignore disconnection errors
      }
      setDeviceState(null);
    }
    setLastDevice(null);
    await DeviceStorage.clearLastDevice();
  }, [device]);

  const value: ConnectedDeviceContextValue = {
    device,
    isConnected: device !== null,
    isConnecting,
    lastDevice,
    setDevice,
    autoConnect,
    forgetDevice,
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
