import { useRouter } from "expo-router";
import { type PropsWithChildren, useMemo } from "react";
import { StatusBar, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BatteryGauge } from "@/components/home/battery-gauge";
import { EmptySlotCard } from "@/components/home/empty-slot-card";
import { EnvironmentCard } from "@/components/home/environment-card";
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
  type ThemeColors,
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

const DEFAULT_TANK: TankLevelSnapshot = {
  capacityLiters: 0,
  heightMm: 0,
  percentage: 0,
  lastDistanceMm: null,
  lastMessage: null,
};

export default function HomeScreen() {
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
  const heaterPaired = heaterSlot.pairing !== null;

  const remainingTime = useMemo(() => {
    if (!batteryOnline) return "-";
    const hours = calculateRemainingTime(
      battery.percentage,
      battery.capacityAh,
      battery.current,
    );
    if (hours === null) return "-";
    const suffix = battery.current < 0 ? "restantes" : "pour charger";
    return `${formatRemainingTime(hours)} ${suffix}`;
  }, [battery, batteryOnline]);

  const consumption = batteryOnline ? Math.round(battery.power) : 0;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.safeArea}>
        <PageHeader title="Bord" onSettingsPress={openModules} />

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
            >
              <StatusCard
                icon="water-drop"
                value={`${Math.round(cleanTank.percentage)}%`}
                label="Eau propre"
                backgroundColor={colors.water.clean}
                onPress={() => router.push("/water")}
              />
            </Slot>
            <Slot
              slot={heaterSlot}
              onAdd={openModules}
              onReconnect={() => void reconnect("heater")}
            >
              <StatusCard
                icon="local-fire-department"
                value={heat.isRunning ? "Chauffe" : "Arrêt"}
                label={
                  heat.isRunning
                    ? `> ${heat.setpointCelsius.toFixed(0)}°C`
                    : "-"
                }
                backgroundColor={
                  heat.isRunning ? colors.heater.warm : colors.neutral["500"]
                }
                onPress={() => router.push("/heater")}
              />
            </Slot>
          </View>

          {heaterPaired && (
            <EnvironmentCard
              topLeft={{
                icon: "home",
                value: `${environment.temperatureCelsius.toFixed(1)}°C`,
              }}
              topRight={{
                icon: "water-drop",
                value: `${environment.humidity.toFixed(0)}%`,
              }}
              bottomLeft={{
                icon: "park",
                value: `${environment.exteriorTemperatureCelsius.toFixed(1)}°C`,
              }}
              bottomRight={{
                icon: "speed",
                value: `${environment.pressureHPa.toFixed(0)} hPa`,
              }}
              backgroundColor={colors.background.secondary}
            />
          )}

          {nothingPaired && (
            <Button onPress={openModules}>Ajouter un module</Button>
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
}>;

function Slot({ slot, onAdd, onReconnect, children }: SlotProps) {
  if (!slot.pairing) {
    return <EmptySlotCard title={slot.module.tabTitle} onPress={onAdd} />;
  }

  return (
    <ModuleCard link={slot.link} onReconnect={onReconnect}>
      {children}
    </ModuleCard>
  );
}

const getStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background.primary,
    },
    safeArea: {
      flex: 1,
    },
    content: {
      flex: 1,
      paddingHorizontal: 20,
      gap: 24,
    },
    gaugeSection: {
      alignItems: "center",
      paddingVertical: 10,
    },
    cardsRow: {
      flexDirection: "row",
      gap: 12,
    },
  });
