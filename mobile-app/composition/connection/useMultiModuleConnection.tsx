import React, {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useRef,
} from "react";
import { useContainer } from "@/composition/ContainerProvider";
import {
  useBatteryDevice,
  useHeaterDevice,
  useWaterDevice,
} from "@/composition/connection/useModuleDevice";

export type GlobalConnectionStatus =
  | "connected"
  | "partial"
  | "disconnected"
  | "connecting";

export type MultiModuleConnectionContextValue = {
  /** Global status across all modules */
  globalStatus: GlobalConnectionStatus;
  /** Connect to all saved modules */
  connectAll: () => Promise<void>;
  /** Disconnect from all modules */
  disconnectAll: () => Promise<void>;
  /** Whether any connection operation is in progress */
  isConnecting: boolean;
};

const MultiModuleConnectionContext =
  createContext<MultiModuleConnectionContextValue | null>(null);

/** Lets the device providers load their saved pairing before the first try. */
const AUTO_CONNECT_DELAY_MS = 100;

/**
 * Provider that manages connections to ALL BLE modules simultaneously.
 * Auto-connects to all saved modules on mount (app startup).
 * Must be placed inside ContainerProvider and the three device providers.
 */
export function MultiModuleConnectionProvider({ children }: PropsWithChildren) {
  const { bluetooth } = useContainer();
  const waterDevice = useWaterDevice();
  const heaterDevice = useHeaterDevice();
  const batteryDevice = useBatteryDevice();

  // Compute global connection status
  const isConnecting =
    waterDevice.isConnecting ||
    heaterDevice.isConnecting ||
    batteryDevice.isConnecting;

  const waterConnected = waterDevice.isConnected;
  const heaterConnected = heaterDevice.isConnected;
  const batteryConnected = batteryDevice.isConnected;

  const waterHasSavedDevice = waterDevice.lastDevice !== null;
  const heaterHasSavedDevice = heaterDevice.lastDevice !== null;
  const batteryHasSavedDevice = batteryDevice.lastDevice !== null;

  // Count how many modules are connected vs have saved devices
  const connectedCount =
    (waterConnected ? 1 : 0) +
    (heaterConnected ? 1 : 0) +
    (batteryConnected ? 1 : 0);
  const savedCount =
    (waterHasSavedDevice ? 1 : 0) +
    (heaterHasSavedDevice ? 1 : 0) +
    (batteryHasSavedDevice ? 1 : 0);

  let globalStatus: GlobalConnectionStatus;
  if (isConnecting) {
    globalStatus = "connecting";
  } else if (savedCount > 0 && connectedCount === savedCount) {
    globalStatus = "connected";
  } else if (connectedCount > 0) {
    // At least one connected, but not all saved devices
    globalStatus = "partial";
  } else {
    globalStatus = "disconnected";
  }

  // Connect to all saved modules
  const connectAll = useCallback(async () => {
    const promises: Promise<void>[] = [];

    if (waterDevice.lastDevice && !waterDevice.isConnected) {
      promises.push(waterDevice.autoConnect(bluetooth));
    }
    if (heaterDevice.lastDevice && !heaterDevice.isConnected) {
      promises.push(heaterDevice.autoConnect(bluetooth));
    }
    if (batteryDevice.lastDevice && !batteryDevice.isConnected) {
      promises.push(batteryDevice.autoConnect(bluetooth));
    }

    await Promise.all(promises);
  }, [bluetooth, waterDevice, heaterDevice, batteryDevice]);

  const latestConnectAll = useRef(connectAll);

  // Disconnect from all modules
  const disconnectAll = useCallback(async () => {
    const promises: Promise<void>[] = [];

    if (waterDevice.isConnected) {
      promises.push(waterDevice.disconnect());
    }
    if (heaterDevice.isConnected) {
      promises.push(heaterDevice.disconnect());
    }
    if (batteryDevice.isConnected) {
      promises.push(batteryDevice.disconnect());
    }

    await Promise.all(promises);
  }, [waterDevice, heaterDevice, batteryDevice]);

  useEffect(() => {
    latestConnectAll.current = connectAll;
  });

  // Depending on `connectAll` here would cancel the timer on the next render.
  useEffect(() => {
    const timer = setTimeout(() => {
      void latestConnectAll.current();
    }, AUTO_CONNECT_DELAY_MS);

    return () => clearTimeout(timer);
  }, []);

  const value: MultiModuleConnectionContextValue = {
    globalStatus,
    connectAll,
    disconnectAll,
    isConnecting,
  };

  return (
    <MultiModuleConnectionContext.Provider value={value}>
      {children}
    </MultiModuleConnectionContext.Provider>
  );
}

/**
 * Hook to access the multi-module connection context.
 * Must be used within a MultiModuleConnectionProvider.
 */
export function useMultiModuleConnection(): MultiModuleConnectionContextValue {
  const ctx = useContext(MultiModuleConnectionContext);
  if (!ctx) {
    throw new Error(
      "useMultiModuleConnection must be used within a MultiModuleConnectionProvider",
    );
  }
  return ctx;
}
