import type { ComponentProps } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { IconSymbol } from "@/design-system/atoms/icon-symbol";
import { useStyles } from "@/design-system/theme/use-styles";
import { useThemeColor } from "@/design-system/theme/use-theme-color";
import {
  BorderRadius,
  Opacity,
  type Palette,
  Spacing,
  TextStyles,
} from "@/design-system/tokens";

export type IconName = ComponentProps<typeof IconSymbol>["name"];

const ROW_HEIGHT = 68;
const CHIP_SIZE = 40;
const CHIP_ICON_SIZE = 20;
const CHEVRON_SIZE = 22;

export type NavRowProps = {
  icon: IconName;
  /** The caller's colour: the design system names no module. */
  iconBackground: string;
  title: string;
  subtitle: string;
  /** The destination is out of reach for now — the row still goes there. */
  dimmed?: boolean;
  onPress: () => void;
};

export function NavRow({
  icon,
  iconBackground,
  title,
  subtitle,
  dimmed = false,
  onPress,
}: NavRowProps) {
  const colors = useThemeColor();
  const styles = useStyles(makeStyles);

  return (
    <Pressable
      testID="nav-row"
      style={[styles.row, dimmed && styles.dimmed]}
      onPress={onPress}
    >
      <View style={[styles.chip, { backgroundColor: iconBackground }]}>
        <IconSymbol name={icon} size={CHIP_ICON_SIZE} color={colors.onFill} />
      </View>
      <View style={styles.texts}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
      <IconSymbol
        name="chevron-right"
        size={CHEVRON_SIZE}
        color={colors.textMuted}
      />
    </Pressable>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "center",
      height: ROW_HEIGHT,
      paddingHorizontal: Spacing.xxl,
      gap: Spacing.xl,
      borderRadius: BorderRadius.l,
      backgroundColor: colors.surface,
    },
    dimmed: {
      opacity: Opacity.faint,
    },
    chip: {
      width: CHIP_SIZE,
      height: CHIP_SIZE,
      borderRadius: BorderRadius.s,
      alignItems: "center",
      justifyContent: "center",
    },
    texts: {
      flex: 1,
      gap: Spacing.xxs,
    },
    title: {
      ...TextStyles.rowTitle,
      color: colors.text,
    },
    subtitle: {
      ...TextStyles.monoSmall,
      color: colors.textMuted,
    },
  });
