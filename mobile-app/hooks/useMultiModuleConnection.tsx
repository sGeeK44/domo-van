import React, {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useRef,
} from "react";
import { useBle } from "@/components/BleProvider";
import {
  useBatteryDevice,
  useHeaterDevice,
  useWaterDevice,
} from "@/hooks/useModuleDevice";

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

/**
 * Provider that manages connections to ALL BLE modules simultaneously.
 * Auto-connects to all saved modules on mount (app startup).
 * Must be placed inside BleProvider, WaterDeviceProviderV2, and HeaterDeviceProviderV2.
 */
export function MultiModuleConnectionProvider({ children }: PropsWithChildren) {
  const { bluetooth } = useBle();
  const waterDevice = useWaterDevice();
  const heaterDevice = useHeaterDevice();
  const batteryDevice = useBatteryDevice();
  const hasAutoConnected = useRef(false);

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

  // Auto-connect on mount (app startup only)
  useEffect(() => {
    if (hasAutoConnected.current) return;
    hasAutoConnected.current = true;

    // Small delay to ensure providers are ready
    const timer = setTimeout(() => {
      void connectAll();
    }, 100);

    return () => clearTimeout(timer);
  }, [connectAll]);

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
