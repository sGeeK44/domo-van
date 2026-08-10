import { useRouter } from "expo-router";
import { useMemo } from "react";
import { StatusBar, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BatteryGauge } from "@/components/home/battery-gauge";
import { EnvironmentCard } from "@/components/home/environment-card";
import { StatusCard } from "@/components/home/status-card";
import {
  useBatteryDevice,
  useHeaterDevice,
  useWaterDevice,
} from "@/composition/connection/useModuleDevice";
import { useMultiModuleConnection } from "@/composition/connection/useMultiModuleConnection";
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

  const { globalStatus, connectAll, disconnectAll } =
    useMultiModuleConnection();
  const waterDevice = useWaterDevice();
  const heaterDevice = useHeaterDevice();
  const batteryDevice = useBatteryDevice();
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
    if (!batteryDevice.isConnected) return "-";
    const hours = calculateRemainingTime(
      battery.percentage,
      battery.capacityAh,
      battery.current,
    );
    if (hours === null) return "-";
    const suffix = battery.current < 0 ? "restantes" : "pour charger";
    return `${formatRemainingTime(hours)} ${suffix}`;
  }, [battery, batteryDevice.isConnected]);

  // Calculate consumption in watts (negative = consuming, positive = charging)
  const consumption = batteryDevice.isConnected ? Math.round(battery.power) : 0;

  const handleBluetoothPress = () => {
    if (globalStatus === "connected" || globalStatus === "partial") {
      void disconnectAll();
    } else {
      void connectAll();
    }
  };

  const bluetoothStatus =
    globalStatus === "connecting" ? "loading" : globalStatus;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.safeArea}>
        <PageHeader
          title="Home"
          onSettingsPress={() => router.push("/battery-settings")}
          onBluetoothPress={handleBluetoothPress}
          bluetoothStatus={bluetoothStatus}
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
              isConnected={batteryDevice.isConnected}
            />
          </View>

          {/* Status Cards Row */}
          <View style={styles.cardsRow}>
            <StatusCard
              icon="water-drop"
              value={
                waterDevice.isConnected ? `${MOCK_WATER.percentage}%` : "-"
              }
              backgroundColor={
                waterDevice.isConnected
                  ? colors.water.clean
                  : colors.neutral["500"]
              }
              onPress={() => router.push("/water")}
            />
            <StatusCard
              icon="local-fire-department"
              value={heaterDevice.isConnected ? "Chauffe" : "-"}
              label={
                heaterDevice.isConnected ? `> ${MOCK_HEATER.setpoint}°C` : "-"
              }
              backgroundColor={
                heaterDevice.isConnected
                  ? colors.heater.warm
                  : colors.neutral["500"]
              }
              onPress={() => router.push("/heater")}
            />
          </View>

          {/* Environment Card - Quadrant Layout */}
          <EnvironmentCard
            topLeft={{
              icon: "home",
              value: heaterDevice.isConnected
                ? `${environment.temperatureCelsius.toFixed(1)}°C`
                : "-",
            }}
            topRight={{
              icon: "water-drop",
              value: heaterDevice.isConnected
                ? `${environment.humidity.toFixed(0)}%`
                : "-",
            }}
            bottomLeft={{
              icon: "park",
              value: heaterDevice.isConnected
                ? `${environment.exteriorTemperatureCelsius.toFixed(1)}°C`
                : "-",
            }}
            bottomRight={{
              icon: "speed",
              value: heaterDevice.isConnected
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
