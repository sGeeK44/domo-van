import { Pressable, StyleSheet, Text, View } from "react-native";
import { Card, Colors, FontSize, FontWeight } from "@/design-system";
import { IconSymbol } from "@/design-system/atoms/icon-symbol";
import type { HeaterZoneSnapshot } from "@/domain/heater/HeaterZone";
import { useThemeColor } from "@/hooks/use-theme-color";

export type HeaterZoneCardProps = {
  name: string;
  zoneState: HeaterZoneSnapshot;
  onSetpointChange: (newSetpoint: number) => void;
  onToggle: () => void;
};

const SETPOINT_STEP = 0.5; // 0.5°C per button press

export function HeaterZoneCard({
  name,
  zoneState,
  onSetpointChange,
  onToggle,
}: HeaterZoneCardProps) {
  const colors = useThemeColor();
  const styles = getStyles(colors);

  const { temperatureCelsius, setpointCelsius, isRunning } = zoneState;

  const handleIncrement = () => {
    const newSetpoint = Math.min(50, setpointCelsius + SETPOINT_STEP);
    onSetpointChange(newSetpoint);
  };

  const handleDecrement = () => {
    const newSetpoint = Math.max(0, setpointCelsius - SETPOINT_STEP);
    onSetpointChange(newSetpoint);
  };

  // Determine temperature color based on difference from setpoint
  const tempDiff = temperatureCelsius - setpointCelsius;
  const tempColor =
    tempDiff >= 0
      ? (colors.heater?.warm ?? "#FF6B35")
      : (colors.heater?.cold ?? "#42A5F5");

  return (
    <Card title={name} subtitle={isRunning ? "Actif" : "Arrêté"}>
      <View style={styles.content}>
        {/* Current Temperature Display */}
        <View style={styles.temperatureSection}>
          <Text style={[styles.currentTemp, { color: tempColor }]}>
            {temperatureCelsius.toFixed(1)}°
          </Text>
          <Text style={styles.tempLabel}>actuel</Text>
        </View>

        {/* Setpoint Controls */}
        <View style={styles.setpointSection}>
          <Pressable
            onPress={handleDecrement}
            style={({ pressed }) => [
              styles.controlButton,
              pressed && styles.controlButtonPressed,
            ]}
            hitSlop={8}
          >
            <IconSymbol name="remove" size={24} color="#FFFFFF" />
          </Pressable>

          <View style={styles.setpointDisplay}>
            <Text style={styles.setpointValue}>
              {setpointCelsius.toFixed(1)}°
            </Text>
            <Text style={styles.setpointLabel}>consigne</Text>
          </View>

          <Pressable
            onPress={handleIncrement}
            style={({ pressed }) => [
              styles.controlButton,
              pressed && styles.controlButtonPressed,
            ]}
            hitSlop={8}
          >
            <IconSymbol name="add" size={24} color="#FFFFFF" />
          </Pressable>
        </View>

        {/* Power Toggle */}
        <Pressable
          onPress={onToggle}
          style={({ pressed }) => [
            styles.toggleButton,
            isRunning ? styles.toggleButtonOn : styles.toggleButtonOff,
            pressed && { opacity: 0.8 },
          ]}
        >
          <IconSymbol
            name={isRunning ? "power-settings-new" : "power-off"}
            size={20}
            color={isRunning ? "#000000" : "#FFFFFF"}
          />
          <Text
            style={[
              styles.toggleButtonText,
              { color: isRunning ? "#000000" : "#FFFFFF" },
            ]}
          >
            {isRunning ? "ON" : "OFF"}
          </Text>
        </Pressable>
      </View>
    </Card>
  );
}

const getStyles = (colors: typeof Colors.light | typeof Colors.dark) =>
  StyleSheet.create({
    content: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: 12,
    },
    temperatureSection: {
      alignItems: "center",
    },
    currentTemp: {
      fontSize: 42,
      fontWeight: "900" as const,
      letterSpacing: -2,
    },
    tempLabel: {
      fontSize: FontSize.xs,
      color: colors.neutral["500"],
      marginTop: -4,
    },
    setpointSection: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 12,
    },
    controlButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: "rgba(255, 255, 255, 0.15)",
      justifyContent: "center",
      alignItems: "center",
    },
    controlButtonPressed: {
      backgroundColor: "rgba(255, 255, 255, 0.25)",
    },
    setpointDisplay: {
      alignItems: "center",
      minWidth: 70,
    },
    setpointValue: {
      fontSize: FontSize.xl,
      fontWeight: FontWeight.bold,
      color: colors.info["500"],
    },
    setpointLabel: {
      fontSize: FontSize.xxs,
      color: colors.neutral["500"],
    },
    toggleButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingVertical: 10,
      paddingHorizontal: 20,
      borderRadius: 20,
    },
    toggleButtonOn: {
      backgroundColor: colors.heater?.warm ?? "#FF6B35",
    },
    toggleButtonOff: {
      backgroundColor: "rgba(255, 255, 255, 0.1)",
      borderWidth: 1,
      borderColor: "rgba(255, 255, 255, 0.2)",
    },
    toggleButtonText: {
      fontSize: FontSize.s,
      fontWeight: FontWeight.bold,
    },
  });
