import type { Bluetooth } from "@/core/bluetooth/Bluetooth";
import type { ModuleKey } from "@/hooks/DeviceStorage";
import { useHeaterDevice, useWaterDevice } from "@/hooks/useModuleDevice";
import React, {
  createContext,
  useCallback,
  useContext,
  useState,
  type PropsWithChildren,
} from "react";

export type ActiveModuleContextValue = {
  activeModule: ModuleKey | null;
  isSwitching: boolean;
  switchToModule: (moduleKey: ModuleKey, bluetooth: Bluetooth) => Promise<void>;
};

const ActiveModuleContext = createContext<ActiveModuleContextValue | null>(null);

/**
 * Provider that manages the active BLE module.
 * Coordinates disconnection from one module before connecting to another.
 * Must be placed inside both WaterDeviceProviderV2 and HeaterDeviceProviderV2.
 */
export function ActiveModuleProvider({ children }: PropsWithChildren) {
  const [activeModule, setActiveModule] = useState<ModuleKey | null>(null);
  const [isSwitching, setIsSwitching] = useState(false);

  const waterDevice = useWaterDevice();
  const heaterDevice = useHeaterDevice();

  const switchToModule = useCallback(
    async (moduleKey: ModuleKey, bluetooth: Bluetooth) => {
      // Already on the requested module, just ensure connection
      if (activeModule === moduleKey) {
        if (moduleKey === "water" && !waterDevice.isConnected && !waterDevice.isConnecting) {
          await waterDevice.autoConnect(bluetooth);
        } else if (moduleKey === "heater" && !heaterDevice.isConnected && !heaterDevice.isConnecting) {
          await heaterDevice.autoConnect(bluetooth);
        }
        return;
      }

      setIsSwitching(true);

      try {
        // Disconnect from the current active module
        if (activeModule === "water" && waterDevice.isConnected) {
          await waterDevice.disconnect();
        } else if (activeModule === "heater" && heaterDevice.isConnected) {
          await heaterDevice.disconnect();
        }

        // Set the new active module
        setActiveModule(moduleKey);

        // Connect to the new module
        if (moduleKey === "water") {
          await waterDevice.autoConnect(bluetooth);
        } else if (moduleKey === "heater") {
          await heaterDevice.autoConnect(bluetooth);
        }
      } finally {
        setIsSwitching(false);
      }
    },
    [activeModule, waterDevice, heaterDevice]
  );

  const value: ActiveModuleContextValue = {
    activeModule,
    isSwitching,
    switchToModule,
  };

  return (
    <ActiveModuleContext.Provider value={value}>
      {children}
    </ActiveModuleContext.Provider>
  );
}

/**
 * Hook to access the active module context.
 * Must be used within an ActiveModuleProvider.
 */
export function useActiveModule(): ActiveModuleContextValue {
  const ctx = useContext(ActiveModuleContext);
  if (!ctx) {
    throw new Error("useActiveModule must be used within an ActiveModuleProvider");
  }
  return ctx;
}
