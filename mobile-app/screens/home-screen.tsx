import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { DashboardCard } from "@/components/home/dashboard-card";
import {
  type DashboardReadings,
  dashboardCards,
} from "@/components/home/dashboard-cards";
import { environmentTiles } from "@/components/home/environment-view";
import {
  useModuleRegistry,
  useModuleSlots,
} from "@/composition/ModuleRegistryProvider";
import {
  useBatterySystem,
  useHeaterSystem,
  useWaterSystem,
} from "@/composition/ModuleSystemsProvider";
import { useObservable } from "@/core/react/useObservable";
import {
  IconSymbol,
  PageHeader,
  type Palette,
  Spacing,
  StatTile,
  TextStyles,
  useStyles,
  useThemeColor,
} from "@/design-system";
import { DEFAULT_BATTERY_SNAPSHOT } from "@/domain/battery/BatteryTelemetry";
import { DEFAULT_ENVIRONMENT } from "@/domain/heater/EnvironmentData";
import type { ModuleKey } from "@/domain/modules/ModuleDescriptor";
import type { ModuleSlot } from "@/domain/modules/ModuleSlot";
import { DEFAULT_TANK_SNAPSHOT } from "@/domain/water/TankLevelSensor";
import { useHeaterSummary } from "@/screens/hooks/useHeaterSummary";

const MODULES_ROUTE = "/modules";
const SETTINGS_ROUTE = "/settings";

/** Every module tab is the route its key names, see components/navigation/module-tabs.ts. */
const MODULE_ROUTE = {
  battery: "/battery",
  water: "/water",
  heater: "/heater",
} as const satisfies Record<ModuleKey, string>;

export default function HomeScreen() {
  const { t } = useTranslation();
  const styles = useStyles(makeStyles);
  const router = useRouter();
  const openModules = () => router.push(MODULES_ROUTE);
  const openSettings = () => router.push(SETTINGS_ROUTE);

  const { reconnect } = useModuleRegistry();
  const slots = useModuleSlots();
  const cards = dashboardCards(slots, useDashboardReadings());

  const heaterOnline = isOnline(slots, "heater");
  const environment = useObservable(
    useHeaterSystem()?.environment ?? null,
    DEFAULT_ENVIRONMENT,
  );

  const anyPaired = slots.some((slot) => slot.pairing !== null);
  const anyFree = slots.some((slot) => slot.pairing === null);

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
        <PageHeader
          title={t("dashboard.title")}
          onSettingsPress={openSettings}
        />

        <View style={styles.content}>
          {!anyPaired && (
            <Text style={styles.empty}>{t("dashboard.empty.body")}</Text>
          )}

          <View style={styles.cards}>
            {cards.map((view) => (
              <DashboardCard
                key={view.id}
                view={view}
                onAdd={openModules}
                onOpen={() => router.push(MODULE_ROUTE[view.moduleKey])}
                onReconnect={() => void reconnect(view.moduleKey)}
              />
            ))}
          </View>

          {anyFree && <AddModuleButton onPress={openModules} />}

          {anyPaired && (
            <View style={styles.tiles}>
              {environmentTiles(environment, heaterOnline).map((tile) => (
                <StatTile
                  key={tile.labelKey}
                  testID={`environment-tile-${tile.labelKey}`}
                  label={t(tile.labelKey)}
                  value={tile.value}
                />
              ))}
            </View>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

function AddModuleButton({ onPress }: { onPress: () => void }) {
  const { t } = useTranslation();
  const colors = useThemeColor();
  const styles = useStyles(makeStyles);

  return (
    <Pressable testID="add-module" onPress={onPress} style={styles.addButton}>
      <IconSymbol name="add" size={ADD_ICON_SIZE} color={colors.onInverse} />
      <Text style={styles.addLabel}>
        {t("dashboard.addModule").toUpperCase()}
      </Text>
    </Pressable>
  );
}

/** What every card reads from, gathered once: a card is a view, not a subscriber. */
function useDashboardReadings(): DashboardReadings {
  const water = useWaterSystem();

  return {
    battery: useObservable(useBatterySystem(), DEFAULT_BATTERY_SNAPSHOT),
    cleanTank: useObservable(water?.cleanTank ?? null, DEFAULT_TANK_SNAPSHOT),
    greyTank: useObservable(water?.greyTank ?? null, DEFAULT_TANK_SNAPSHOT),
    heater: useHeaterSummary(),
  };
}

function isOnline(slots: readonly ModuleSlot[], key: ModuleKey): boolean {
  const slot = slots.find((candidate) => candidate.module.key === key);
  return slot?.link.status === "online";
}

/** The mockup's 68 / 22 add button; neither lands on a token step. */
const ADD_HEIGHT = 68;
const ADD_RADIUS = 22;
const ADD_ICON_SIZE = 24;

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.screen,
    },
    safeArea: {
      flex: 1,
    },
    content: {
      flex: 1,
      paddingTop: Spacing.s,
      paddingHorizontal: Spacing.gutter,
    },
    empty: {
      ...TextStyles.body,
      color: colors.textMuted,
      paddingTop: Spacing.xs,
      paddingBottom: Spacing.xxxl,
    },
    cards: {
      gap: Spacing.l,
    },
    addButton: {
      height: ADD_HEIGHT,
      marginTop: Spacing.l,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: Spacing.m,
      borderRadius: ADD_RADIUS,
      backgroundColor: colors.inverse,
    },
    addLabel: {
      ...TextStyles.button,
      color: colors.onInverse,
    },
    tiles: {
      flexDirection: "row",
      gap: Spacing.m,
      paddingTop: Spacing.xl,
      paddingBottom: Spacing.xxl,
    },
  });
