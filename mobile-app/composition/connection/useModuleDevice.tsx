// Temporary tenant of composition/: these are React state machines, not
// wiring. #3 replaces them and this directory disappears.

import React, {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { Device } from "react-native-ble-plx";
import { useContainer } from "@/composition/ContainerProvider";
import type { DeviceInfo } from "@/domain/ports/DeviceRepository";
import type { Bluetooth } from "@/infrastructure/ble/Bluetooth";

/** Connection timeout in milliseconds */
const CONNECTION_TIMEOUT_MS = 15_000;

/**
 * Wraps a promise with a timeout. Rejects with TimeoutError if timeout expires.
 */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error("Connection timeout"));
    }, ms);

    promise
      .then((result) => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

export type ModuleDeviceContextValue = {
  device: Device | null;
  isConnected: boolean;
  isConnecting: boolean;
  lastDevice: DeviceInfo | null;
  setDevice: (device: Device | null) => void;
  autoConnect: (bluetooth: Bluetooth) => Promise<void>;
  disconnect: () => Promise<void>;
  forgetDevice: () => Promise<void>;
};

// Create separate contexts for type-safe module-specific hooks
const WaterDeviceContext = createContext<ModuleDeviceContextValue | null>(null);
const HeaterDeviceContext = createContext<ModuleDeviceContextValue | null>(
  null,
);
const BatteryDeviceContext = createContext<ModuleDeviceContextValue | null>(
  null,
);

/** Specialized water device provider with its own context */
export function WaterDeviceProviderV2({ children }: PropsWithChildren) {
  const { deviceRepository } = useContainer();
  const [device, setDeviceState] = useState<Device | null>(null);
  const [lastDevice, setLastDevice] = useState<DeviceInfo | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    deviceRepository.getLastDevice("water").then((storedDevice) => {
      if (storedDevice) setLastDevice(storedDevice);
    });
  }, [deviceRepository]);

  const setDevice = useCallback(
    (newDevice: Device | null) => {
      setDeviceState(newDevice);
      if (newDevice) {
        const deviceInfo: DeviceInfo = {
          id: newDevice.id,
          name: newDevice.name ?? "Water Module",
        };
        setLastDevice(deviceInfo);
        void deviceRepository.setLastDevice(deviceInfo, "water");
      }
    },
    [deviceRepository],
  );

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
        const connectionPromise = (async () => {
          const connectedDevice = await bluetooth.connect(lastDevice.id);
          await connectedDevice.discoverAllServicesAndCharacteristics();
          return connectedDevice;
        })();
        const connectedDevice = await withTimeout(
          connectionPromise,
          CONNECTION_TIMEOUT_MS,
        );
        setDevice(connectedDevice);
      } catch {
        // Silently fail
      } finally {
        setIsConnecting(false);
      }
    },
    [lastDevice, device, isConnecting, setDevice],
  );

  // Disconnect without forgetting the device
  const disconnect = useCallback(async () => {
    if (device) {
      try {
        await device.cancelConnection();
      } catch {
        // Ignore disconnection errors
      }
      setDeviceState(null);
    }
  }, [device]);

  const forgetDevice = useCallback(async () => {
    if (device) {
      try {
        await device.cancelConnection();
      } catch {}
      setDeviceState(null);
    }
    setLastDevice(null);
    await deviceRepository.clearLastDevice("water");
  }, [device, deviceRepository]);

  const value: ModuleDeviceContextValue = {
    device,
    isConnected: device !== null,
    isConnecting,
    lastDevice,
    setDevice,
    autoConnect,
    disconnect,
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
  const { deviceRepository } = useContainer();
  const [device, setDeviceState] = useState<Device | null>(null);
  const [lastDevice, setLastDevice] = useState<DeviceInfo | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    deviceRepository.getLastDevice("heater").then((storedDevice) => {
      if (storedDevice) setLastDevice(storedDevice);
    });
  }, [deviceRepository]);

  const setDevice = useCallback(
    (newDevice: Device | null) => {
      setDeviceState(newDevice);
      if (newDevice) {
        const deviceInfo: DeviceInfo = {
          id: newDevice.id,
          name: newDevice.name ?? "Heater Module",
        };
        setLastDevice(deviceInfo);
        void deviceRepository.setLastDevice(deviceInfo, "heater");
      }
    },
    [deviceRepository],
  );

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
        const connectionPromise = (async () => {
          const connectedDevice = await bluetooth.connect(lastDevice.id);
          await connectedDevice.discoverAllServicesAndCharacteristics();
          return connectedDevice;
        })();
        const connectedDevice = await withTimeout(
          connectionPromise,
          CONNECTION_TIMEOUT_MS,
        );
        setDevice(connectedDevice);
      } catch {
        // Silently fail
      } finally {
        setIsConnecting(false);
      }
    },
    [lastDevice, device, isConnecting, setDevice],
  );

  // Disconnect without forgetting the device
  const disconnect = useCallback(async () => {
    if (device) {
      try {
        await device.cancelConnection();
      } catch {
        // Ignore disconnection errors
      }
      setDeviceState(null);
    }
  }, [device]);

  const forgetDevice = useCallback(async () => {
    if (device) {
      try {
        await device.cancelConnection();
      } catch {}
      setDeviceState(null);
    }
    setLastDevice(null);
    await deviceRepository.clearLastDevice("heater");
  }, [device, deviceRepository]);

  const value: ModuleDeviceContextValue = {
    device,
    isConnected: device !== null,
    isConnecting,
    lastDevice,
    setDevice,
    autoConnect,
    disconnect,
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
    throw new Error(
      "useWaterDevice must be used within a WaterDeviceProviderV2",
    );
  }
  return ctx;
}

/** Hook for heater module device - uses dedicated context */
export function useHeaterDevice(): ModuleDeviceContextValue {
  const ctx = useContext(HeaterDeviceContext);
  if (!ctx) {
    throw new Error(
      "useHeaterDevice must be used within a HeaterDeviceProviderV2",
    );
  }
  return ctx;
}

/** Specialized battery device provider with its own context */
export function BatteryDeviceProviderV2({ children }: PropsWithChildren) {
  const { deviceRepository } = useContainer();
  const [device, setDeviceState] = useState<Device | null>(null);
  const [lastDevice, setLastDevice] = useState<DeviceInfo | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    deviceRepository.getLastDevice("battery").then((storedDevice) => {
      if (storedDevice) setLastDevice(storedDevice);
    });
  }, [deviceRepository]);

  const setDevice = useCallback(
    (newDevice: Device | null) => {
      setDeviceState(newDevice);
      if (newDevice) {
        const deviceInfo: DeviceInfo = {
          id: newDevice.id,
          name: newDevice.name ?? "JK BMS",
        };
        setLastDevice(deviceInfo);
        void deviceRepository.setLastDevice(deviceInfo, "battery");
      }
    },
    [deviceRepository],
  );

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
        const connectionPromise = (async () => {
          const connectedDevice = await bluetooth.connect(lastDevice.id);
          await connectedDevice.discoverAllServicesAndCharacteristics();
          return connectedDevice;
        })();
        const connectedDevice = await withTimeout(
          connectionPromise,
          CONNECTION_TIMEOUT_MS,
        );
        setDevice(connectedDevice);
      } catch {
        // Silently fail
      } finally {
        setIsConnecting(false);
      }
    },
    [lastDevice, device, isConnecting, setDevice],
  );

  // Disconnect without forgetting the device
  const disconnect = useCallback(async () => {
    if (device) {
      try {
        await device.cancelConnection();
      } catch {
        // Ignore disconnection errors
      }
      setDeviceState(null);
    }
  }, [device]);

  const forgetDevice = useCallback(async () => {
    if (device) {
      try {
        await device.cancelConnection();
      } catch {}
      setDeviceState(null);
    }
    setLastDevice(null);
    await deviceRepository.clearLastDevice("battery");
  }, [device, deviceRepository]);

  const value: ModuleDeviceContextValue = {
    device,
    isConnected: device !== null,
    isConnecting,
    lastDevice,
    setDevice,
    autoConnect,
    disconnect,
    forgetDevice,
  };

  return (
    <BatteryDeviceContext.Provider value={value}>
      {children}
    </BatteryDeviceContext.Provider>
  );
}

/** Hook for battery module device - uses dedicated context */
export function useBatteryDevice(): ModuleDeviceContextValue {
  const ctx = useContext(BatteryDeviceContext);
  if (!ctx) {
    throw new Error(
      "useBatteryDevice must be used within a BatteryDeviceProviderV2",
    );
  }
  return ctx;
}
