import {
  createContext,
  type PropsWithChildren,
  useContext,
  useMemo,
} from "react";
import { BleManager } from "react-native-ble-plx";

import { Bluetooth } from "@/core/bluetooth/Bluetooth";

type BleContextValue = {
  bluetooth: Bluetooth;
};

const BleContext = createContext<BleContextValue | null>(null);

export function BleProvider({ children }: PropsWithChildren) {
  const manager = useMemo(() => new BleManager(), []);
  const bluetooth = useMemo(() => new Bluetooth(manager), [manager]);

  const value: BleContextValue = {
    bluetooth,
  };

  return <BleContext.Provider value={value}>{children}</BleContext.Provider>;
}

export function useBle(): BleContextValue {
  const ctx = useContext(BleContext);
  if (!ctx) {
    throw new Error("useBle must be used within a BleProvider");
  }
  return ctx;
}
