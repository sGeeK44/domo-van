import { StyleSheet, Text, View } from "react-native";
import { Colors, FontSize, FontWeight, IconSymbol } from "@/design-system";
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
      <IconSymbol name={icon} size={24} color={colors.neutral["500"]} />
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const getStyles = (colors: typeof Colors.light | typeof Colors.dark) =>
  StyleSheet.create({
    container: {
      alignItems: "center",
      gap: 4,
    },
    value: {
      fontSize: FontSize.l,
      fontWeight: FontWeight.semiBold,
      color: colors.info["500"],
    },
    label: {
      fontSize: FontSize.xs,
      color: colors.neutral["500"],
    },
  });
