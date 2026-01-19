import { BatteryGauge } from "@/components/home/battery-gauge";
import { EnvironmentIndicator } from "@/components/home/environment-indicator";
import { StatusCard } from "@/components/home/status-card";
import { Colors } from "@/design-system";
import { PageHeader } from "@/design-system/molecules/page-header";
import { BatterySystem } from "@/domain/battery/BatterySystem";
import {
  calculateRemainingTime,
  DEFAULT_BATTERY_SNAPSHOT,
  formatRemainingTime
} from "@/domain/battery/BatteryTelemetry";
import { useThemeColor } from "@/hooks/use-theme-color";
import {
  useBatteryDevice,
  useHeaterDevice,
  useWaterDevice,
} from "@/hooks/useModuleDevice";
import { useMultiModuleConnection } from "@/hooks/useMultiModuleConnection";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { StatusBar, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// Mocked data for modules not yet connected to real data
const MOCK_WATER = {
  percentage: 75,
};

const MOCK_HEATER = {
  isActive: true,
  setpoint: 20,
};

const MOCK_ENVIRONMENT = {
  interiorTemp: 19,
  exteriorTemp: 12,
  humidity: 45,
};

/**
 * Hook to subscribe to observable values
 */
function useObservable<T>(
  observable: { getValue: () => T; subscribe: (fn: (v: T) => void) => () => void } | null,
  defaultValue: T,
): T {
  const [value, setValue] = useState<T>(observable?.getValue() ?? defaultValue);

  useEffect(() => {
    if (!observable) {
      setValue(defaultValue);
      return;
    }
    setValue(observable.getValue());
    return observable.subscribe(setValue);
  }, [observable, defaultValue]);

  return value;
}

export default function HomeScreen() {
  const colors = useThemeColor();
  const styles = getStyles(colors);
  const router = useRouter();

  const { globalStatus, connectAll, disconnectAll } = useMultiModuleConnection();
  const waterDevice = useWaterDevice();
  const heaterDevice = useHeaterDevice();
  const batteryDevice = useBatteryDevice();

  // Create BatterySystem when device is connected
  const batterySystem = useMemo(
    () => (batteryDevice.device ? new BatterySystem(batteryDevice.device) : null),
    [batteryDevice.device],
  );

  // Cleanup BatterySystem on unmount or device change
  useEffect(() => {
    return () => {
      batterySystem?.dispose();
    };
  }, [batterySystem]);

  // Subscribe to battery data
  const battery = useObservable(batterySystem, DEFAULT_BATTERY_SNAPSHOT);

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

  const bluetoothStatus = globalStatus === "connecting" ? "loading" : globalStatus;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.safeArea}>
        <PageHeader
          title="Home"
          onSettingsPress={() => router.push("/modal")}
          onBluetoothPress={handleBluetoothPress}
          bluetoothStatus={bluetoothStatus}
        />

        {/* Content */}
        <View style={styles.content}>
          {/* Battery Gauge */}
          <View style={styles.gaugeSection}>
            <BatteryGauge
              percentage={batteryDevice.isConnected ? battery.percentage : 0}
              remainingTime={remainingTime}
              voltage={batteryDevice.isConnected ? battery.voltage : 0}
              consumption={consumption}
            />
          </View>

          {/* Status Cards Row */}
          <View style={styles.cardsRow}>
            <StatusCard
              icon="water-drop"
              value={waterDevice.isConnected ? `${MOCK_WATER.percentage}%` : "-"}
              backgroundColor={waterDevice.isConnected ? colors.water.clean : colors.neutral["500"]}
              onPress={() => router.push("/water")}
            />
            <StatusCard
              icon="local-fire-department"
              value={heaterDevice.isConnected ? "Chauffe" : "-"}
              label={heaterDevice.isConnected ? `> ${MOCK_HEATER.setpoint}°C` : "-"}
              backgroundColor={heaterDevice.isConnected ? colors.heater.warm : colors.neutral["500"]}
              onPress={() => router.push("/heater")}
            />
          </View>

          {/* Environment Indicators Row */}
          <View style={styles.indicatorsRow}>
            <EnvironmentIndicator
              icon="home"
              value={heaterDevice.isConnected ? `${MOCK_ENVIRONMENT.interiorTemp}°C` : "-"}
              label="Intérieur"
            />
            <EnvironmentIndicator
              icon="cloud"
              value={heaterDevice.isConnected ? `${MOCK_ENVIRONMENT.exteriorTemp}°C` : "-"}
              label="Extérieur"
            />
            <EnvironmentIndicator
              icon="water-drop"
              value={heaterDevice.isConnected ? `${MOCK_ENVIRONMENT.humidity}%` : "-"}
              label="Humidité"
            />
          </View>
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
    indicatorsRow: {
      flexDirection: "row",
      justifyContent: "space-around",
      paddingVertical: 16,
      backgroundColor: colors.background.secondary,
      borderRadius: 16,
    },
  });
