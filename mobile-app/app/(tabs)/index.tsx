import { BatteryGauge } from "@/components/home/battery-gauge";
import { EnvironmentIndicator } from "@/components/home/environment-indicator";
import { StatusCard } from "@/components/home/status-card";
import { Colors } from "@/design-system";
import { PageHeader } from "@/design-system/molecules/page-header";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useHeaterDevice, useWaterDevice } from "@/hooks/useModuleDevice";
import { useMultiModuleConnection } from "@/hooks/useMultiModuleConnection";
import { useRouter } from "expo-router";
import { StatusBar, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// Mocked data for now - will be connected to actual modules later
const MOCK_BATTERY = {
  percentage: 85,
  remainingTime: "12h 30m restantes",
  voltage: 13.4,
  consumption: -48,
};

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

export default function HomeScreen() {
  const colors = useThemeColor();
  const styles = getStyles(colors);
  const router = useRouter();

  const { globalStatus, connectAll, disconnectAll } = useMultiModuleConnection();
  const waterDevice = useWaterDevice();
  const heaterDevice = useHeaterDevice();

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
              percentage={MOCK_BATTERY.percentage}
              remainingTime={MOCK_BATTERY.remainingTime}
              voltage={MOCK_BATTERY.voltage}
              consumption={MOCK_BATTERY.consumption}
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
