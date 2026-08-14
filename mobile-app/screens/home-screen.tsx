import { useRouter } from "expo-router";
import { type PropsWithChildren, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  StatusBar,
  type StyleProp,
  StyleSheet,
  View,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BatteryGauge } from "@/components/home/battery-gauge";
import { EmptySlotCard } from "@/components/home/empty-slot-card";
import { EnvironmentCard } from "@/components/home/environment-card";
import { environmentReadings } from "@/components/home/environment-view";
import { ModuleCard } from "@/components/home/module-card";
import { StatusCard } from "@/components/home/status-card";
import {
  useModuleRegistry,
  useModuleSlot,
} from "@/composition/ModuleRegistryProvider";
import {
  useBatterySystem,
  useHeaterSystem,
  useWaterSystem,
} from "@/composition/ModuleSystemsProvider";
import { useObservable } from "@/core/react/useObservable";
import {
  Button,
  PageHeader,
  type Palette,
  useThemeColor,
} from "@/design-system";
import {
  calculateRemainingTime,
  DEFAULT_BATTERY_SNAPSHOT,
  formatRemainingTime,
} from "@/domain/battery/BatteryTelemetry";
import { EnvironmentSnapshot } from "@/domain/heater/EnvironmentData";
import type { ModuleSlot } from "@/domain/modules/ModuleSlot";
import { TankLevelSnapshot } from "@/domain/water/TankLevelSensor";
import { useHeaterSummary } from "@/screens/hooks/useHeaterSummary";

const DEFAULT_ENVIRONMENT: EnvironmentSnapshot = {
  temperatureCelsius: 0,
  exteriorTemperatureCelsius: 0,
  humidity: 0,
  pressureHPa: 1013.25,
  lastMessage: null,
};

/** A dash is not copy: it stands in for a measurement no module reported. */
const NO_READING = "-";

const DEFAULT_TANK: TankLevelSnapshot = {
  capacityLiters: 0,
  heightMm: 0,
  percentage: 0,
  lastDistanceMm: null,
  lastMessage: null,
};

export default function HomeScreen() {
  const { t } = useTranslation();
  const colors = useThemeColor();
  const styles = getStyles(colors);
  const router = useRouter();
  const openModules = () => router.push("/modules");

  const { reconnect } = useModuleRegistry();
  const batterySlot = useModuleSlot("battery");
  const waterSlot = useModuleSlot("water");
  const heaterSlot = useModuleSlot("heater");
  const nothingPaired = [batterySlot, waterSlot, heaterSlot].every(
    (slot) => slot.pairing === null,
  );

  const batterySystem = useBatterySystem();
  const waterSystem = useWaterSystem();
  const heaterSystem = useHeaterSystem();

  const battery = useObservable(batterySystem, DEFAULT_BATTERY_SNAPSHOT);
  const cleanTank = useObservable(waterSystem?.cleanTank ?? null, DEFAULT_TANK);
  const environment = useObservable(
    heaterSystem?.environment ?? null,
    DEFAULT_ENVIRONMENT,
  );
  const heat = useHeaterSummary();

  const batteryOnline = batterySlot.link.status === "online";
  const waterOnline = waterSlot.link.status === "online";
  const heaterOnline = heaterSlot.link.status === "online";
  const heaterPaired = heaterSlot.pairing !== null;
  const heating = heaterOnline && heat.isRunning;

  const remainingTime = useMemo(() => {
    if (!batteryOnline) return NO_READING;
    const hours = calculateRemainingTime(
      battery.percentage,
      battery.capacityAh,
      battery.current,
    );
    if (hours === null) return NO_READING;
    const key =
      battery.current < 0
        ? "dashboard.battery.remaining"
        : "dashboard.battery.charging";
    return t(key, { duration: formatRemainingTime(hours) });
  }, [battery, batteryOnline, t]);

  const consumption = batteryOnline ? Math.round(battery.power) : 0;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.safeArea}>
        <PageHeader
          title={t("dashboard.title")}
          onSettingsPress={openModules}
        />

        <View style={styles.content}>
          <View style={styles.gaugeSection}>
            <Slot
              slot={batterySlot}
              onAdd={openModules}
              onReconnect={() => void reconnect("battery")}
            >
              <BatteryGauge
                percentage={battery.percentage}
                remainingTime={remainingTime}
                voltage={battery.voltage}
                consumption={consumption}
                isConnected={batteryOnline}
              />
            </Slot>
          </View>

          <View style={styles.cardsRow}>
            <Slot
              slot={waterSlot}
              onAdd={openModules}
              onReconnect={() => void reconnect("water")}
              style={styles.rowSlot}
            >
              <StatusCard
                icon="water-drop"
                value={
                  waterOnline
                    ? `${Math.round(cleanTank.percentage)}%`
                    : NO_READING
                }
                label={t("dashboard.water.label")}
                backgroundColor={colors.fill.cleanWater}
                onPress={() => router.push("/water")}
              />
            </Slot>
            <Slot
              slot={heaterSlot}
              onAdd={openModules}
              onReconnect={() => void reconnect("heater")}
              style={styles.rowSlot}
            >
              <StatusCard
                icon="local-fire-department"
                value={
                  heaterOnline
                    ? t(
                        heat.isRunning
                          ? "dashboard.heater.running"
                          : "dashboard.heater.stopped",
                      )
                    : NO_READING
                }
                label={
                  heating
                    ? t("dashboard.heater.setpoint", {
                        temperature: heat.setpointCelsius.toFixed(0),
                      })
                    : NO_READING
                }
                backgroundColor={heating ? colors.fill.heat : colors.off}
                onPress={() => router.push("/heater")}
              />
            </Slot>
          </View>

          {heaterPaired && (
            <EnvironmentCard
              {...environmentReadings(environment, heaterOnline)}
              backgroundColor={colors.surface}
            />
          )}

          {nothingPaired && (
            <Button onPress={openModules}>{t("dashboard.addModule")}</Button>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

type SlotProps = PropsWithChildren<{
  slot: ModuleSlot;
  onAdd: () => void;
  onReconnect: () => void;
  style?: StyleProp<ViewStyle>;
}>;

function Slot({ slot, onAdd, onReconnect, style, children }: SlotProps) {
  const { t } = useTranslation();

  if (!slot.pairing) {
    return (
      <EmptySlotCard
        title={t(slot.module.tabTitleKey)}
        onPress={onAdd}
        style={style}
      />
    );
  }

  return (
    <ModuleCard link={slot.link} onReconnect={onReconnect} style={style}>
      {children}
    </ModuleCard>
  );
}

const getStyles = (colors: Palette) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.screen,
    },
    safeArea: {
      flex: 1,
    },
    content: {
      flex: 1,
      paddingHorizontal: 20,
      gap: 24,
    },
    // the gauge centres itself, so the card spans the width and keeps a measurable one
    gaugeSection: {
      paddingVertical: 10,
    },
    cardsRow: {
      flexDirection: "row",
      gap: 12,
    },
    rowSlot: {
      flex: 1,
    },
  });
