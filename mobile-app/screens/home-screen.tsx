import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { StyleSheet, Text, View } from "react-native";
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
  PageHeader,
  type Palette,
  Spacing,
  StatTile,
  TextStyles,
  useStyles,
} from "@/design-system";
import { DEFAULT_BATTERY_SNAPSHOT } from "@/domain/battery/BatteryTelemetry";
import { DEFAULT_ENVIRONMENT } from "@/domain/heater/EnvironmentData";
import type { ModuleKey } from "@/domain/modules/ModuleDescriptor";
import type { ModuleSlot } from "@/domain/modules/ModuleSlot";
import { DEFAULT_TANK_SNAPSHOT } from "@/domain/water/TankLevelSensor";
import { useHeaterSummary } from "@/screens/hooks/useHeaterSummary";

const ADD_MODULE_ROUTE = "/add-module";
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
  const addModule = () => router.push(ADD_MODULE_ROUTE);

  const { reconnect } = useModuleRegistry();
  const slots = useModuleSlots();
  const cards = dashboardCards(slots, useDashboardReadings());

  const heaterOnline = isOnline(slots, "heater");
  const environment = useObservable(
    useHeaterSystem()?.environment ?? null,
    DEFAULT_ENVIRONMENT,
  );

  const anyPaired = slots.some((slot) => slot.pairing !== null);

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
        <PageHeader
          title={t("dashboard.title")}
          onSettingsPress={() => router.push(SETTINGS_ROUTE)}
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
                onAdd={addModule}
                onOpen={() => router.push(MODULE_ROUTE[view.moduleKey])}
                onReconnect={() => void reconnect(view.moduleKey)}
              />
            ))}
          </View>

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
    tiles: {
      flexDirection: "row",
      gap: Spacing.m,
      paddingTop: Spacing.xl,
      paddingBottom: Spacing.xxl,
    },
  });
