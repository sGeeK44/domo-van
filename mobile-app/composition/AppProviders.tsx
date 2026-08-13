import type { PropsWithChildren } from "react";
import { ContainerProvider } from "@/composition/ContainerProvider";
import { ModuleRegistryProvider } from "@/composition/ModuleRegistryProvider";

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <ContainerProvider>
      <ModuleRegistryProvider>{children}</ModuleRegistryProvider>
    </ContainerProvider>
  );
}
