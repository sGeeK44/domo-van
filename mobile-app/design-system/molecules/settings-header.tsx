import { Pressable, StyleSheet, Text, View } from "react-native";
import { IconSymbol } from "@/design-system/atoms/icon-symbol";
import { useStyles } from "@/design-system/theme/use-styles";
import { useThemeColor } from "@/design-system/theme/use-theme-color";
import {
  FontSize,
  FontWeight,
  type Palette,
  Spacing,
} from "@/design-system/tokens";

export type SettingsHeaderProps = {
  title: string;
  onBackPress: () => void;
};

export function SettingsHeader({ title, onBackPress }: SettingsHeaderProps) {
  const colors = useThemeColor();
  const styles = useStyles(makeStyles);

  return (
    <View style={styles.header}>
      <Pressable onPress={onBackPress} hitSlop={10}>
        <IconSymbol name="arrow-back" size={22} color={colors.text} />
      </Pressable>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.spacer} />
    </View>
  );
}

const makeStyles = (colors: Palette) =>
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
      color: colors.text,
      fontSize: FontSize.xl,
      fontWeight: `${FontWeight.extraBold}`,
    },
    spacer: {
      width: 22,
    },
  });
