import {
  createContext,
  type PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
} from "react";
import { useContainer } from "@/composition/ContainerProvider";
import {
  useBatteryDevice,
  useHeaterDevice,
  useWaterDevice,
} from "@/composition/connection/useModuleDevice";
import { BatterySystem } from "@/domain/battery/BatterySystem";
import { HeaterSystem } from "@/domain/heater/HeaterSystem";
import { HEATER_MODULE, WATER_MODULE } from "@/domain/modules/ModuleDescriptor";
import { WaterSystem } from "@/domain/water/WaterSystem";

type ModuleSystems = {
  waterSystem: WaterSystem | null;
  heaterSystem: HeaterSystem | null;
  batterySystem: BatterySystem | null;
};

const ModuleSystemsContext = createContext<ModuleSystems | null>(null);

/**
 * Owns the lifetime of the three module systems: one instance per connected
 * device, disposed when that device changes or the app unmounts.
 *
 * Deliberately policy-free — no retry, no timeout, no reconnection. It only
 * maps `device → transport → system`.
 */
export function ModuleSystemsProvider({ children }: PropsWithChildren) {
  const { transports } = useContainer();
  const { device: waterDevice } = useWaterDevice();
  const { device: heaterDevice } = useHeaterDevice();
  const { device: batteryDevice } = useBatteryDevice();

  const waterSystem = useMemo(
    () =>
      waterDevice && WATER_MODULE.serviceId
        ? new WaterSystem(
            transports.moduleTransport(waterDevice, WATER_MODULE.serviceId),
          )
        : null,
    [transports, waterDevice],
  );

  const heaterSystem = useMemo(
    () =>
      heaterDevice && HEATER_MODULE.serviceId
        ? new HeaterSystem(
            transports.moduleTransport(heaterDevice, HEATER_MODULE.serviceId),
          )
        : null,
    [transports, heaterDevice],
  );

  const batterySystem = useMemo(
    () =>
      batteryDevice
        ? new BatterySystem(transports.binaryTransport(batteryDevice))
        : null,
    [transports, batteryDevice],
  );

  useEffect(() => () => waterSystem?.dispose(), [waterSystem]);
  useEffect(() => () => heaterSystem?.dispose(), [heaterSystem]);
  useEffect(() => () => batterySystem?.dispose(), [batterySystem]);

  const value = useMemo(
    () => ({ waterSystem, heaterSystem, batterySystem }),
    [waterSystem, heaterSystem, batterySystem],
  );

  return (
    <ModuleSystemsContext.Provider value={value}>
      {children}
    </ModuleSystemsContext.Provider>
  );
}

function useModuleSystems(): ModuleSystems {
  const ctx = useContext(ModuleSystemsContext);
  if (!ctx) {
    throw new Error(
      "useModuleSystems must be used within a ModuleSystemsProvider",
    );
  }
  return ctx;
}

export function useWaterSystem(): WaterSystem | null {
  return useModuleSystems().waterSystem;
}

export function useHeaterSystem(): HeaterSystem | null {
  return useModuleSystems().heaterSystem;
}

export function useBatterySystem(): BatterySystem | null {
  return useModuleSystems().batterySystem;
}
