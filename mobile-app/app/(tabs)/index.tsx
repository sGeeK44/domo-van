import { StatusBar, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { BatteryGauge } from "@/components/home/battery-gauge";
import { StatusCard } from "@/components/home/status-card";
import { EnvironmentIndicator } from "@/components/home/environment-indicator";
import { Colors, PageTitle, Spacing } from "@/design-system";
import { useThemeColor } from "@/hooks/use-theme-color";

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

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <PageTitle>Home</PageTitle>
        </View>

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
              value={`${MOCK_WATER.percentage}%`}
              backgroundColor={colors.water.clean}
              onPress={() => router.push("/water")}
            />
            <StatusCard
              icon="local-fire-department"
              value="Chauffe"
              label={`> ${MOCK_HEATER.setpoint}°C`}
              backgroundColor={colors.heater.warm}
              onPress={() => router.push("/heater")}
            />
          </View>

          {/* Environment Indicators Row */}
          <View style={styles.indicatorsRow}>
            <EnvironmentIndicator
              icon="home"
              value={`${MOCK_ENVIRONMENT.interiorTemp}°C`}
              label="Intérieur"
            />
            <EnvironmentIndicator
              icon="cloud"
              value={`${MOCK_ENVIRONMENT.exteriorTemp}°C`}
              label="Extérieur"
            />
            <EnvironmentIndicator
              icon="water-drop"
              value={`${MOCK_ENVIRONMENT.humidity}%`}
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
    header: {
      paddingHorizontal: Spacing.m,
      paddingBottom: Spacing.l,
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
