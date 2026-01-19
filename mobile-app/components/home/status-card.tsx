import { Pressable, StyleSheet, Text, View } from "react-native";
import { BorderRadius, Colors, FontSize, FontWeight, IconSymbol } from "@/design-system";
import { useThemeColor } from "@/hooks/use-theme-color";
import type { ComponentProps } from "react";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

export type StatusCardProps = {
  icon: ComponentProps<typeof MaterialIcons>["name"];
  value: string;
  label?: string;
  backgroundColor: string;
  onPress?: () => void;
};

export function StatusCard({
  icon,
  value,
  label,
  backgroundColor,
  onPress,
}: StatusCardProps) {
  const colors = useThemeColor();
  const styles = getStyles(colors);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        { backgroundColor },
        pressed && styles.pressed,
      ]}
      onPress={onPress}
      disabled={!onPress}
    >
      <IconSymbol name={icon} size={28} color="#FFFFFF" style={styles.icon} />
      <Text style={styles.value}>{value}</Text>
      {label && <Text style={styles.label}>{label}</Text>}
    </Pressable>
  );
}

const getStyles = (_colors: typeof Colors.light | typeof Colors.dark) =>
  StyleSheet.create({
    card: {
      flex: 1,
      borderRadius: BorderRadius.l,
      padding: 16,
      minHeight: 100,
      justifyContent: "center",
      alignItems: "flex-start",
    },
    pressed: {
      opacity: 0.85,
    },
    icon: {
      marginBottom: 8,
    },
    value: {
      fontSize: FontSize.xxl,
      fontWeight: FontWeight.bold,
      color: "#FFFFFF",
    },
    label: {
      fontSize: FontSize.xs,
      color: "rgba(255, 255, 255, 0.8)",
      marginTop: 2,
    },
  });
