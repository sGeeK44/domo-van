import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useStyles } from "@/design-system/theme/use-styles";
import {
  BorderRadius,
  type Palette,
  Spacing,
  TextStyles,
} from "@/design-system/tokens";

const ACCENT_WIDTH = 5;

/** The bar runs to the card's edge, so the content clears it instead of the padding. */
const CONTENT_INSET = Spacing.s;

export type AccentCardProps = {
  /** The caller's colour: the design system names no module. */
  accent: string;
  label: string;
  /** A form holding several cards tells them apart with this. */
  testID?: string;
  children: ReactNode;
};

export function AccentCard({
  accent,
  label,
  testID = "accent-card",
  children,
}: AccentCardProps) {
  const styles = useStyles(makeStyles);

  return (
    <View testID={testID} style={styles.card}>
      <View
        testID={`${testID}-bar`}
        style={[styles.accent, { backgroundColor: accent }]}
      />
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    card: {
      borderRadius: BorderRadius.xl,
      backgroundColor: colors.surface,
      overflow: "hidden",
      paddingVertical: Spacing.gutter,
      paddingHorizontal: Spacing.xxl,
      gap: Spacing.xl,
    },
    accent: {
      position: "absolute",
      left: 0,
      top: 0,
      bottom: 0,
      width: ACCENT_WIDTH,
    },
    label: {
      ...TextStyles.cardLabel,
      color: colors.text,
      paddingLeft: CONTENT_INSET,
    },
  });
