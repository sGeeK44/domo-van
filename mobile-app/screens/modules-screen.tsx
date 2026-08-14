import { useRootNavigationState, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView, StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { errorMessage } from "@/components/error-message";
import { FreeSlotRow, ModuleSlotRow, UnpairSheet } from "@/components/modules";
import {
  useModuleRegistry,
  useModuleSlots,
} from "@/composition/ModuleRegistryProvider";
import {
  FontSize,
  type Palette,
  SettingsHeader,
  Spacing,
  useThemeColor,
} from "@/design-system";
import type { ModuleKey } from "@/domain/modules/ModuleDescriptor";
import type { ModuleSlot } from "@/domain/modules/ModuleSlot";

const SETTINGS_ROUTE = {
  water: "/water-settings",
  heater: "/heater-settings",
  battery: "/battery-settings",
} as const;

const DASHBOARD_ROUTE = "/(tabs)";

export default function ModulesScreen() {
  const { t } = useTranslation();
  const colors = useThemeColor();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();

  const slots = useModuleSlots();
  const { unpair } = useModuleRegistry();
  const navigationState = useRootNavigationState();

  const [leaving, setLeaving] = useState<ModuleSlot | null>(null);
  const [isUnpairing, setIsUnpairing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const occupied = slots.filter((slot) => slot.pairing !== null);
  const free = slots.filter((slot) => slot.pairing === null);

  const confirmUnpair = async () => {
    if (!leaving || isUnpairing) return;
    const key = leaving.module.key;

    setIsUnpairing(true);
    setError(null);
    try {
      await unpair(key);
      // replace would stack a second tabs navigator over the first; dismissTo pops back to it
      if (openTabName(navigationState) === key) {
        router.dismissTo(DASHBOARD_ROUTE);
      }
      setLeaving(null);
    } catch (cause: unknown) {
      // the slot is already free in memory but storage still holds the pairing, so it would come back at the next launch
      setError(errorMessage(cause, t, "modules.list.unpairFailed"));
    } finally {
      setIsUnpairing(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <SettingsHeader
        title={t("modules.list.title")}
        onBackPress={() => router.back()}
      />

      <ScrollView contentContainerStyle={styles.list}>
        {error && <Text style={styles.error}>{error}</Text>}
        {occupied.map((slot) => (
          <ModuleSlotRow
            key={slot.module.key}
            slot={slot}
            onOpenSettings={() => router.push(SETTINGS_ROUTE[slot.module.key])}
            onUnpair={() => setLeaving(slot)}
          />
        ))}
        {free.map((slot) => (
          <FreeSlotRow
            key={slot.module.key}
            module={slot.module}
            onPress={() => router.push("/add-module")}
          />
        ))}
      </ScrollView>

      <UnpairSheet
        visible={leaving !== null}
        moduleName={leaving ? t(leaving.module.displayNameKey) : ""}
        deviceName={leaving?.pairing?.name ?? ""}
        isUnpairing={isUnpairing}
        onCancel={() => setLeaving(null)}
        onConfirm={confirmUnpair}
      />
    </SafeAreaView>
  );
}

type NavigationSnapshot = {
  index?: number;
  routes?: readonly { name: string; state?: NavigationSnapshot }[];
};

/** A tab route is named after the module it shows, so the open tab reads as a module key. */
function openTabName(
  state: NavigationSnapshot | undefined,
): ModuleKey | undefined {
  const tabs = state?.routes?.find((route) => route.name === "(tabs)")?.state;
  if (!tabs?.routes || tabs.index === undefined) return undefined;
  const name = tabs.routes[tabs.index]?.name;
  return name === "water" || name === "heater" || name === "battery"
    ? name
    : undefined;
}

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.screen,
    },
    list: {
      paddingHorizontal: Spacing.xxl,
      paddingBottom: Spacing.xxl,
      gap: Spacing.m,
    },
    error: {
      color: colors.danger,
      fontSize: FontSize.xs,
    },
  });
