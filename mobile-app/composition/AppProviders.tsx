import type { PropsWithChildren } from "react";
import { ContainerProvider } from "@/composition/ContainerProvider";
import {
  LanguageProvider,
  type LanguageProviderProps,
} from "@/composition/LanguageProvider";
import { ModuleRegistryProvider } from "@/composition/ModuleRegistryProvider";

type AppProvidersProps = PropsWithChildren<
  Omit<LanguageProviderProps, "children">
>;

export function AppProviders({ children, ...language }: AppProvidersProps) {
  return (
    <LanguageProvider {...language}>
      <ContainerProvider>
        <ModuleRegistryProvider>{children}</ModuleRegistryProvider>
      </ContainerProvider>
    </LanguageProvider>
  );
}
