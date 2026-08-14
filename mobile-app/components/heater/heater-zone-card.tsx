import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  Card,
  FontSize,
  FontWeight,
  IconSymbol,
  type Palette,
  useThemeColor,
} from "@/design-system";
import type { HeaterZoneSnapshot } from "@/domain/heater/HeaterZone";

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
  const tempColor = tempDiff >= 0 ? colors.line.heat : colors.line.cleanWater;

  return (
    <Card
      title={name}
      subtitle={isRunning ? "Actif" : "Arrêté"}
      style={styles.card}
    >
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
            <IconSymbol name="remove" size={24} color={colors.text} />
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
            <IconSymbol name="add" size={24} color={colors.text} />
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
            color={isRunning ? colors.onFill : colors.text}
          />
          <Text
            style={[
              styles.toggleButtonText,
              { color: isRunning ? colors.onFill : colors.text },
            ]}
          >
            {isRunning ? "ON" : "OFF"}
          </Text>
        </Pressable>
      </View>
    </Card>
  );
}

const getStyles = (colors: Palette) =>
  StyleSheet.create({
    // a zone fills the slot the grid gives it
    card: {
      flex: 1,
    },
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
      color: colors.textMuted,
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
      backgroundColor: colors.screen,
      justifyContent: "center",
      alignItems: "center",
    },
    controlButtonPressed: {
      backgroundColor: colors.off,
    },
    setpointDisplay: {
      alignItems: "center",
      minWidth: 70,
    },
    setpointValue: {
      fontSize: FontSize.xl,
      fontWeight: FontWeight.bold,
      color: colors.text,
    },
    setpointLabel: {
      fontSize: FontSize.xxs,
      color: colors.textMuted,
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
      backgroundColor: colors.fill.heat,
    },
    toggleButtonOff: {
      backgroundColor: colors.screen,
      borderWidth: 1,
      borderColor: colors.border,
    },
    toggleButtonText: {
      fontSize: FontSize.s,
      fontWeight: FontWeight.bold,
    },
  });
