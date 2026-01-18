import type { Bluetooth } from "@/core/bluetooth/Bluetooth";
import { DeviceStorage, type DeviceInfo, type ModuleKey } from "@/hooks/DeviceStorage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type PropsWithChildren,
} from "react";
import { Device, Subscription } from "react-native-ble-plx";

export type ModuleDeviceContextValue = {
  device: Device | null;
  isConnected: boolean;
  isConnecting: boolean;
  lastDevice: DeviceInfo | null;
  setDevice: (device: Device | null) => void;
  autoConnect: (bluetooth: Bluetooth) => Promise<void>;
  forgetDevice: () => Promise<void>;
};

type ModuleDeviceProviderProps = PropsWithChildren<{
  moduleKey: ModuleKey;
  defaultDeviceName: string;
}>;

const ModuleDeviceContext = createContext<ModuleDeviceContextValue | null>(null);

/**
 * Generic provider for managing a BLE device connection for a specific module.
 * Each module (water, heater, etc.) should have its own provider instance.
 */
export function ModuleDeviceProvider({
  children,
  moduleKey,
  defaultDeviceName,
}: ModuleDeviceProviderProps) {
  const [device, setDeviceState] = useState<Device | null>(null);
  const [lastDevice, setLastDevice] = useState<DeviceInfo | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  // Load lastDevice from storage on mount
  useEffect(() => {
    DeviceStorage.getLastDevice(moduleKey).then((storedDevice) => {
      if (storedDevice) {
        setLastDevice(storedDevice);
      }
    });
  }, [moduleKey]);

  // Wrapper to persist device info when setting device
  const setDevice = useCallback(
    (newDevice: Device | null) => {
      setDeviceState(newDevice);
      if (newDevice) {
        const deviceInfo: DeviceInfo = {
          id: newDevice.id,
          name: newDevice.name ?? defaultDeviceName,
        };
        setLastDevice(deviceInfo);
        void DeviceStorage.setLastDevice(deviceInfo, moduleKey);
      }
    },
    [moduleKey, defaultDeviceName]
  );

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
    await DeviceStorage.clearLastDevice(moduleKey);
  }, [device, moduleKey]);

  const value: ModuleDeviceContextValue = {
    device,
    isConnected: device !== null,
    isConnecting,
    lastDevice,
    setDevice,
    autoConnect,
    forgetDevice,
  };

  return (
    <ModuleDeviceContext.Provider value={value}>
      {children}
    </ModuleDeviceContext.Provider>
  );
}

/**
 * Hook to access the module device context.
 * Must be used within a ModuleDeviceProvider.
 */
export function useModuleDevice(): ModuleDeviceContextValue {
  const ctx = useContext(ModuleDeviceContext);
  if (!ctx) {
    throw new Error(
      "useModuleDevice must be used within a ModuleDeviceProvider"
    );
  }
  return ctx;
}

// ============================================================================
// Specialized providers and hooks for each module type
// ============================================================================

/** Water module device provider */
export function WaterDeviceProvider({ children }: PropsWithChildren) {
  return (
    <ModuleDeviceProvider moduleKey="water" defaultDeviceName="Water Module">
      {children}
    </ModuleDeviceProvider>
  );
}

/** Heater module device provider */
export function HeaterDeviceProvider({ children }: PropsWithChildren) {
  return (
    <ModuleDeviceProvider moduleKey="heater" defaultDeviceName="Heater Module">
      {children}
    </ModuleDeviceProvider>
  );
}

// Create separate contexts for type-safe module-specific hooks
const WaterDeviceContext = createContext<ModuleDeviceContextValue | null>(null);
const HeaterDeviceContext = createContext<ModuleDeviceContextValue | null>(null);

/** Specialized water device provider with its own context */
export function WaterDeviceProviderV2({ children }: PropsWithChildren) {
  const [device, setDeviceState] = useState<Device | null>(null);
  const [lastDevice, setLastDevice] = useState<DeviceInfo | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    DeviceStorage.getLastDevice("water").then((storedDevice) => {
      if (storedDevice) setLastDevice(storedDevice);
    });
  }, []);

  const setDevice = useCallback((newDevice: Device | null) => {
    setDeviceState(newDevice);
    if (newDevice) {
      const deviceInfo: DeviceInfo = {
        id: newDevice.id,
        name: newDevice.name ?? "Water Module",
      };
      setLastDevice(deviceInfo);
      void DeviceStorage.setLastDevice(deviceInfo, "water");
    }
  }, []);

  useEffect(() => {
    if (!device) return;
    const subscription = device.onDisconnected(() => setDeviceState(null));
    return () => subscription?.remove();
  }, [device]);

  const autoConnect = useCallback(
    async (bluetooth: Bluetooth) => {
      if (!lastDevice || device !== null || isConnecting) return;
      setIsConnecting(true);
      try {
        const connectedDevice = await bluetooth.connect(lastDevice.id);
        await connectedDevice.discoverAllServicesAndCharacteristics();
        setDevice(connectedDevice);
      } catch {
        // Silently fail
      } finally {
        setIsConnecting(false);
      }
    },
    [lastDevice, device, isConnecting, setDevice]
  );

  const forgetDevice = useCallback(async () => {
    if (device) {
      try {
        await device.cancelConnection();
      } catch {}
      setDeviceState(null);
    }
    setLastDevice(null);
    await DeviceStorage.clearLastDevice("water");
  }, [device]);

  const value: ModuleDeviceContextValue = {
    device,
    isConnected: device !== null,
    isConnecting,
    lastDevice,
    setDevice,
    autoConnect,
    forgetDevice,
  };

  return (
    <WaterDeviceContext.Provider value={value}>
      {children}
    </WaterDeviceContext.Provider>
  );
}

/** Specialized heater device provider with its own context */
export function HeaterDeviceProviderV2({ children }: PropsWithChildren) {
  const [device, setDeviceState] = useState<Device | null>(null);
  const [lastDevice, setLastDevice] = useState<DeviceInfo | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    DeviceStorage.getLastDevice("heater").then((storedDevice) => {
      if (storedDevice) setLastDevice(storedDevice);
    });
  }, []);

  const setDevice = useCallback((newDevice: Device | null) => {
    setDeviceState(newDevice);
    if (newDevice) {
      const deviceInfo: DeviceInfo = {
        id: newDevice.id,
        name: newDevice.name ?? "Heater Module",
      };
      setLastDevice(deviceInfo);
      void DeviceStorage.setLastDevice(deviceInfo, "heater");
    }
  }, []);

  useEffect(() => {
    if (!device) return;
    const subscription = device.onDisconnected(() => setDeviceState(null));
    return () => subscription?.remove();
  }, [device]);

  const autoConnect = useCallback(
    async (bluetooth: Bluetooth) => {
      if (!lastDevice || device !== null || isConnecting) return;
      setIsConnecting(true);
      try {
        const connectedDevice = await bluetooth.connect(lastDevice.id);
        await connectedDevice.discoverAllServicesAndCharacteristics();
        setDevice(connectedDevice);
      } catch {
        // Silently fail
      } finally {
        setIsConnecting(false);
      }
    },
    [lastDevice, device, isConnecting, setDevice]
  );

  const forgetDevice = useCallback(async () => {
    if (device) {
      try {
        await device.cancelConnection();
      } catch {}
      setDeviceState(null);
    }
    setLastDevice(null);
    await DeviceStorage.clearLastDevice("heater");
  }, [device]);

  const value: ModuleDeviceContextValue = {
    device,
    isConnected: device !== null,
    isConnecting,
    lastDevice,
    setDevice,
    autoConnect,
    forgetDevice,
  };

  return (
    <HeaterDeviceContext.Provider value={value}>
      {children}
    </HeaterDeviceContext.Provider>
  );
}

/** Hook for water module device - uses dedicated context */
export function useWaterDevice(): ModuleDeviceContextValue {
  const ctx = useContext(WaterDeviceContext);
  if (!ctx) {
    throw new Error("useWaterDevice must be used within a WaterDeviceProviderV2");
  }
  return ctx;
}

/** Hook for heater module device - uses dedicated context */
export function useHeaterDevice(): ModuleDeviceContextValue {
  const ctx = useContext(HeaterDeviceContext);
  if (!ctx) {
    throw new Error("useHeaterDevice must be used within a HeaterDeviceProviderV2");
  }
  return ctx;
}
