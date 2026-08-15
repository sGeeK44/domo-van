import { useRouter } from "expo-router";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ZONE_NAME_KEYS } from "@/components/heater/zone-names";
import { HeaterPidSection } from "@/components/heater-settings";
import { AdminSection } from "@/components/module-settings";
import { ModuleLinkNotice } from "@/components/modules";
import {
  useModuleRegistry,
  useModuleSlot,
} from "@/composition/ModuleRegistryProvider";
import { useHeaterSystem } from "@/composition/ModuleSystemsProvider";
import { type Palette, SettingsHeader, useThemeColor } from "@/design-system";
import { HEATER_MODULE } from "@/domain/modules/ModuleDescriptor";

export default function HeaterSettingsScreen() {
  const { t } = useTranslation();
  const colors = useThemeColor();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();

  const { pairing, link } = useModuleSlot(HEATER_MODULE.key);
  const { reconnect } = useModuleRegistry();
  const heaterSystem = useHeaterSystem();

  const isOnline = link.status === "online";

  return (
    <SafeAreaView style={styles.container}>
      <SettingsHeader
        title={t("heater.settings.title")}
        onBackPress={() => router.back()}
      />

      <ScrollView>
        {isOnline ? (
          heaterSystem && (
            <>
              <AdminSection
                adminModule={heaterSystem.admin}
                deviceName={pairing?.name ?? null}
              />
              {heaterSystem.zones.map((zone, index) => (
                <HeaterPidSection
                  key={index}
                  heaterZone={zone}
                  zoneName={t(ZONE_NAME_KEYS[index])}
                />
              ))}
            </>
          )
        ) : (
          <ModuleLinkNotice
            deviceName={pairing?.name ?? null}
            isConnecting={link.status === "connecting"}
            onReconnect={() => void reconnect(HEATER_MODULE.key)}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.screen,
    },
  });
