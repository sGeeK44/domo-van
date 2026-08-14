import type { PropsWithChildren } from "react";
import { I18nextProvider } from "react-i18next";
import { ContainerProvider } from "@/composition/ContainerProvider";
import { ModuleRegistryProvider } from "@/composition/ModuleRegistryProvider";
import { createI18n } from "@/i18n/createI18n";
import { deviceLanguage } from "@/i18n/language";

const i18n = createI18n(deviceLanguage());

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <I18nextProvider i18n={i18n}>
      <ContainerProvider>
        <ModuleRegistryProvider>{children}</ModuleRegistryProvider>
      </ContainerProvider>
    </I18nextProvider>
  );
}
