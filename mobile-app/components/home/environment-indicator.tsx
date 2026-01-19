import { StyleSheet, Text, View } from "react-native";
import { FontSize, FontWeight, IconSymbol, type ThemeColors } from "@/design-system";
import { useThemeColor } from "@/hooks/use-theme-color";
import type { ComponentProps } from "react";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

export type EnvironmentIndicatorProps = {
  icon: ComponentProps<typeof MaterialIcons>["name"];
  value: string;
  label: string;
};

export function EnvironmentIndicator({
  icon,
  value,
  label,
}: EnvironmentIndicatorProps) {
  const colors = useThemeColor();
  const styles = getStyles(colors);

  return (
    <View style={styles.container}>
      <IconSymbol name={icon} size={24} color={colors.text.secondary} />
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const getStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      alignItems: "center",
      gap: 4,
    },
    value: {
      fontSize: FontSize.l,
      fontWeight: FontWeight.semiBold,
      color: colors.text.primary,
    },
    label: {
      fontSize: FontSize.xs,
      color: colors.text.secondary,
    },
  });
