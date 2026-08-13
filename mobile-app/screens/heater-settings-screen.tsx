import { useRouter } from "expo-router";
import { useMemo } from "react";
import { ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { HeaterPidSection } from "@/components/heater-settings";
import { AdminSection } from "@/components/module-settings";
import { useModuleSlot } from "@/composition/ModuleRegistryProvider";
import { useHeaterSystem } from "@/composition/ModuleSystemsProvider";
import {
  SettingsHeader,
  type ThemeColors,
  useThemeColor,
} from "@/design-system";
import { HEATER_MODULE } from "@/domain/modules/ModuleDescriptor";

const ZONE_NAMES = ["Cabine", "Cellule", "Soute", "Garage"];

export default function HeaterSettingsScreen() {
  const colors = useThemeColor();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();

  const { pairing, link } = useModuleSlot(HEATER_MODULE.key);
  const heaterSystem = useHeaterSystem();

  const isOnline = link.status === "online";

  return (
    <SafeAreaView style={styles.container}>
      <SettingsHeader title="Chauffage" onBackPress={() => router.back()} />

      <ScrollView>
        {isOnline && heaterSystem && (
          <>
            <AdminSection
              adminModule={heaterSystem.admin}
              deviceName={pairing?.name ?? null}
            />
            {heaterSystem.zones.map((zone, index) => (
              <HeaterPidSection
                key={index}
                heaterZone={zone}
                zoneName={ZONE_NAMES[index]}
              />
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background.primary,
    },
  });
