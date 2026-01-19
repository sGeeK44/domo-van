import { IconSymbol } from "@/design-system/atoms/icon-symbol";
import { FontSize, FontWeight, Spacing, type ThemeColors } from "@/design-system/theme";
import { useThemeColor } from "@/hooks/use-theme-color";
import { Pressable, StyleSheet, Text, View } from "react-native";

export type SettingsHeaderProps = {
  title: string;
  onBackPress: () => void;
};

export function SettingsHeader({ title, onBackPress }: SettingsHeaderProps) {
  const colors = useThemeColor();
  const styles = getStyles(colors);

  return (
    <View style={styles.header}>
      <Pressable onPress={onBackPress} hitSlop={10}>
        <IconSymbol name="arrow-back" size={22} color={colors.text.primary} />
      </Pressable>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.spacer} />
    </View>
  );
}

const getStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: Spacing.xxl,
      paddingTop: Spacing.s,
      paddingBottom: Spacing.l,
    },
    title: {
      color: colors.text.primary,
      fontSize: FontSize.xl,
      fontWeight: `${FontWeight.extraBold}`,
    },
    spacer: {
      width: 22,
    },
  });
