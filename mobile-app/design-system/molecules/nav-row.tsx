import type { ComponentProps, ReactNode } from "react";
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
  /** A list of rows tells them apart with this. */
  testID?: string;
  /** Caller-owned controls that take the chevron's place; they sit outside the tap area. */
  trailing?: ReactNode;
  onPress: () => void;
};

export function NavRow({
  icon,
  iconBackground,
  title,
  subtitle,
  dimmed = false,
  testID = "nav-row",
  trailing,
  onPress,
}: NavRowProps) {
  const colors = useThemeColor();
  const styles = useStyles(makeStyles);

  const content = (
    <>
      <View style={[styles.chip, { backgroundColor: iconBackground }]}>
        <IconSymbol name={icon} size={CHIP_ICON_SIZE} color={colors.onFill} />
      </View>
      <View style={styles.texts}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
    </>
  );

  // The controls are their own press targets, so the tap area is the content, not the whole row.
  if (trailing) {
    return (
      <View style={styles.row}>
        <Pressable
          testID={testID}
          style={[styles.content, dimmed && styles.dimmed]}
          onPress={onPress}
        >
          {content}
        </Pressable>
        {trailing}
      </View>
    );
  }

  return (
    <Pressable
      testID={testID}
      style={[styles.row, dimmed && styles.dimmed]}
      onPress={onPress}
    >
      {content}
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
    content: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: Spacing.xl,
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
