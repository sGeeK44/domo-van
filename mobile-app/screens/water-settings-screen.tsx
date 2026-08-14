import { useRouter } from "expo-router";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AdminSection } from "@/components/module-settings";
import { ModuleLinkNotice } from "@/components/modules";
import { TankSettingsSection } from "@/components/water-settings/TankSettingsSection";
import { ValveSettingsSection } from "@/components/water-settings/ValveSettingsSection";
import {
  useModuleRegistry,
  useModuleSlot,
} from "@/composition/ModuleRegistryProvider";
import { useWaterSystem } from "@/composition/ModuleSystemsProvider";
import { type Palette, SettingsHeader, useThemeColor } from "@/design-system";
import { WATER_MODULE } from "@/domain/modules/ModuleDescriptor";

export default function WaterSettingsScreen() {
  const { t } = useTranslation();
  const colors = useThemeColor();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();

  const { pairing, link } = useModuleSlot(WATER_MODULE.key);
  const { reconnect } = useModuleRegistry();
  const waterSystem = useWaterSystem();

  const isOnline = link.status === "online";

  return (
    <SafeAreaView style={styles.container}>
      <SettingsHeader
        title={t("water.settings.title")}
        onBackPress={() => router.back()}
      />

      <ScrollView>
        {isOnline ? (
          waterSystem && (
            <>
              <AdminSection
                adminModule={waterSystem.admin}
                deviceName={pairing?.name ?? null}
              />
              <TankSettingsSection
                tank={waterSystem.cleanTank}
                label={t("water.settings.cleanTank")}
              />
              <TankSettingsSection
                tank={waterSystem.greyTank}
                label={t("water.settings.greyTank")}
              />
              <ValveSettingsSection valve={waterSystem.greyDrainValve} />
            </>
          )
        ) : (
          <ModuleLinkNotice
            deviceName={pairing?.name ?? null}
            isConnecting={link.status === "connecting"}
            onReconnect={() => void reconnect(WATER_MODULE.key)}
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
