import type { PropsWithChildren } from "react";
import { ContainerProvider } from "@/composition/ContainerProvider";
import {
  BatteryDeviceProviderV2,
  HeaterDeviceProviderV2,
  WaterDeviceProviderV2,
} from "@/composition/connection/useModuleDevice";
import { MultiModuleConnectionProvider } from "@/composition/connection/useMultiModuleConnection";
import { ModuleSystemsProvider } from "@/composition/ModuleSystemsProvider";

/**
 * The provider pyramid, in the one order that works:
 *
 * - the device providers need the container (they read `deviceRepository`);
 * - `MultiModuleConnectionProvider` and `ModuleSystemsProvider` both call
 *   `useWaterDevice()`, which throws outside the three device providers.
 *
 * Nothing type-checks this ordering, so leave it alone unless you have a test.
 */
export function AppProviders({ children }: PropsWithChildren) {
  return (
    <ContainerProvider>
      <WaterDeviceProviderV2>
        <HeaterDeviceProviderV2>
          <BatteryDeviceProviderV2>
            <MultiModuleConnectionProvider>
              <ModuleSystemsProvider>{children}</ModuleSystemsProvider>
            </MultiModuleConnectionProvider>
          </BatteryDeviceProviderV2>
        </HeaterDeviceProviderV2>
      </WaterDeviceProviderV2>
    </ContainerProvider>
  );
}
