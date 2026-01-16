import {
  createContext,
  type PropsWithChildren,
  useContext,
  useEffect,
  useState,
} from "react";
import { Device, Subscription } from "react-native-ble-plx";

export type ConnectedDeviceContextValue = {
  device: Device | null;
  isConnected: boolean;
  setDevice: (device: Device | null) => void;
};

const ConnectedDeviceContext =
  createContext<ConnectedDeviceContextValue | null>(null);

export function ConnectedDeviceProvider({ children }: PropsWithChildren) {
  const [device, setDevice] = useState<Device | null>(null);

  useEffect(() => {
    if (!device) return;

    let subscription: Subscription | null = null;

    subscription = device.onDisconnected(() => {
      setDevice(null);
    });

    return () => {
      subscription?.remove();
    };
  }, [device]);

  const value: ConnectedDeviceContextValue = {
    device,
    isConnected: device !== null,
    setDevice,
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
