import { useRouter } from "expo-router";
import { useMemo } from "react";
import { StatusBar, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BatteryGauge } from "@/components/home/battery-gauge";
import { EnvironmentCard } from "@/components/home/environment-card";
import { StatusCard } from "@/components/home/status-card";
import { useModuleSlot } from "@/composition/ModuleRegistryProvider";
import {
  useBatterySystem,
  useHeaterSystem,
} from "@/composition/ModuleSystemsProvider";
import { useObservable } from "@/core/react/useObservable";
import { Colors, PageHeader, useThemeColor } from "@/design-system";
import {
  calculateRemainingTime,
  DEFAULT_BATTERY_SNAPSHOT,
  formatRemainingTime,
} from "@/domain/battery/BatteryTelemetry";
import { EnvironmentSnapshot } from "@/domain/heater/EnvironmentData";
import { useModulesLink } from "@/screens/hooks/useModulesLink";

// Mocked data for modules not yet connected to real data
const MOCK_WATER = {
  percentage: 75,
};

const MOCK_HEATER = {
  isActive: true,
  setpoint: 20,
};

const DEFAULT_ENVIRONMENT: EnvironmentSnapshot = {
  temperatureCelsius: 0,
  exteriorTemperatureCelsius: 0,
  humidity: 0,
  pressureHPa: 1013.25,
  lastMessage: null,
};

export default function HomeScreen() {
  const colors = useThemeColor();
  const styles = getStyles(colors);
  const router = useRouter();

  const link = useModulesLink();
  const waterOnline = useModuleSlot("water").link.status === "online";
  const heaterOnline = useModuleSlot("heater").link.status === "online";
  const batteryOnline = useModuleSlot("battery").link.status === "online";
  const batterySystem = useBatterySystem();
  const heaterSystem = useHeaterSystem();

  // Subscribe to battery data
  const battery = useObservable(batterySystem, DEFAULT_BATTERY_SNAPSHOT);

  // Subscribe to environment data
  const environment = useObservable(
    heaterSystem?.environment ?? null,
    DEFAULT_ENVIRONMENT,
  );

  // Calculate remaining time based on current flow
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

  // Calculate consumption in watts (negative = consuming, positive = charging)
  const consumption = batteryOnline ? Math.round(battery.power) : 0;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.safeArea}>
        <PageHeader
          title="Home"
          onSettingsPress={() => router.push("/battery-settings")}
          onBluetoothPress={link.reconnectAll}
          bluetoothStatus={link.status}
          bluetoothDisabled={!link.canReconnect}
        />

        {/* Content */}
        <View style={styles.content}>
          {/* Battery Gauge */}
          <View style={styles.gaugeSection}>
            <BatteryGauge
              percentage={battery.percentage}
              remainingTime={remainingTime}
              voltage={battery.voltage}
              consumption={consumption}
              isConnected={batteryOnline}
            />
          </View>

          {/* Status Cards Row */}
          <View style={styles.cardsRow}>
            <StatusCard
              icon="water-drop"
              value={waterOnline ? `${MOCK_WATER.percentage}%` : "-"}
              backgroundColor={
                waterOnline ? colors.water.clean : colors.neutral["500"]
              }
              onPress={() => router.push("/water")}
            />
            <StatusCard
              icon="local-fire-department"
              value={heaterOnline ? "Chauffe" : "-"}
              label={heaterOnline ? `> ${MOCK_HEATER.setpoint}°C` : "-"}
              backgroundColor={
                heaterOnline ? colors.heater.warm : colors.neutral["500"]
              }
              onPress={() => router.push("/heater")}
            />
          </View>

          {/* Environment Card - Quadrant Layout */}
          <EnvironmentCard
            topLeft={{
              icon: "home",
              value: heaterOnline
                ? `${environment.temperatureCelsius.toFixed(1)}°C`
                : "-",
            }}
            topRight={{
              icon: "water-drop",
              value: heaterOnline ? `${environment.humidity.toFixed(0)}%` : "-",
            }}
            bottomLeft={{
              icon: "park",
              value: heaterOnline
                ? `${environment.exteriorTemperatureCelsius.toFixed(1)}°C`
                : "-",
            }}
            bottomRight={{
              icon: "speed",
              value: heaterOnline
                ? `${environment.pressureHPa.toFixed(0)} hPa`
                : "-",
            }}
            backgroundColor={colors.background.secondary}
          />
        </View>
      </SafeAreaView>
    </View>
  );
}

const getStyles = (colors: typeof Colors.light | typeof Colors.dark) =>
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
