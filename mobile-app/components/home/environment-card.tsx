import { StyleSheet, Text, View } from "react-native";
import { BorderRadius, FontSize, FontWeight, IconSymbol, type ThemeColors } from "@/design-system";
import { useThemeColor } from "@/hooks/use-theme-color";
import type { ComponentProps } from "react";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

export type EnvironmentItemData = {
  icon: ComponentProps<typeof MaterialIcons>["name"];
  value: string;
};

export type EnvironmentCardProps = {
  topLeft: EnvironmentItemData;
  topRight: EnvironmentItemData;
  bottomLeft: EnvironmentItemData;
  bottomRight: EnvironmentItemData;
  backgroundColor: string;
};

function EnvironmentItem({ icon, value }: EnvironmentItemData) {
  const colors = useThemeColor();
  const styles = getStyles(colors);

  return (
    <View style={styles.item}>
      <IconSymbol name={icon} size={20} color={colors.text.primary} />
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

export function EnvironmentCard({
  topLeft,
  topRight,
  bottomLeft,
  bottomRight,
  backgroundColor,
}: EnvironmentCardProps) {
  const colors = useThemeColor();
  const styles = getStyles(colors);

  return (
    <View style={[styles.card, { backgroundColor }]}>
      <View style={styles.columns}>
        <View style={styles.column}>
          <EnvironmentItem {...topLeft} />
          <EnvironmentItem {...bottomLeft} />
        </View>
        <View style={styles.divider} />
        <View style={styles.column}>
          <EnvironmentItem {...topRight} />
          <EnvironmentItem {...bottomRight} />
        </View>
      </View>
    </View>
  );
}

const getStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    card: {
      borderRadius: BorderRadius.l,
      padding: 16,
    },
    columns: {
      flexDirection: "row",
      alignItems: "center",
    },
    column: {
      flex: 1,
      gap: 16,
    },
    divider: {
      width: 1,
      alignSelf: "stretch",
      backgroundColor: colors.neutral["500"],
      marginHorizontal: 16,
    },
    item: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    value: {
      fontSize: FontSize.l,
      fontWeight: FontWeight.semiBold,
      color: colors.text.primary,
    },
  });
