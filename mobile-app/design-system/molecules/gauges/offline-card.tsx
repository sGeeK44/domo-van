import type { ComponentProps } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Hatch } from "@/design-system/atoms/hatch";
import { IconSymbol } from "@/design-system/atoms/icon-symbol";
import { useStyles } from "@/design-system/theme/use-styles";
import { useThemeColor } from "@/design-system/theme/use-theme-color";
import {
  BorderRadius,
  type Palette,
  Spacing,
  TextStyles,
} from "@/design-system/tokens";

type IconName = ComponentProps<typeof IconSymbol>["name"];

export type OfflineCardAction = {
  icon: IconName;
  label: string;
  /** A reconnection is in flight: the action reads as pending rather than as an error. */
  busy?: boolean;
  onPress(): void;
};

export type OfflineCardProps = {
  icon: IconName;
  title: string;
  /** The time of last contact, already formatted by the caller. */
  lastContact: string;
  action: OfflineCardAction;
};

/** The mockup's 30 / 22 card padding; neither lands on a Spacing step. */
const PADDING_VERTICAL = 30;
const PADDING_HORIZONTAL = Spacing.xxl + Spacing.xs;

const ICON_SIZE = 34;
const ACTION_HEIGHT = 56;
const ACTION_ICON_SIZE = 20;
const ACTION_BORDER = 1.5;

export function OfflineCard({
  icon,
  title,
  lastContact,
  action,
}: OfflineCardProps) {
  const colors = useThemeColor();
  const styles = useStyles(makeStyles);
  const actionInk = action.busy ? colors.textMuted : colors.danger;

  return (
    <View testID="offline-card" style={styles.card}>
      <Hatch testID="offline-hatch" style={StyleSheet.absoluteFill} />
      {/* Relative, so the whole content layer stacks above the hatch. */}
      <View style={styles.content}>
        <IconSymbol name={icon} size={ICON_SIZE} color={colors.textMuted} />
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.lastContact}>{lastContact}</Text>
        <Pressable
          testID="offline-action"
          onPress={action.onPress}
          style={[styles.action, { borderColor: actionInk }]}
        >
          <IconSymbol
            name={action.icon}
            size={ACTION_ICON_SIZE}
            color={actionInk}
          />
          <Text style={[styles.actionLabel, { color: actionInk }]}>
            {action.label}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    card: {
      borderRadius: BorderRadius.xxxl,
      overflow: "hidden",
      backgroundColor: colors.surface,
    },
    content: {
      position: "relative",
      gap: Spacing.xl,
      paddingVertical: PADDING_VERTICAL,
      paddingHorizontal: PADDING_HORIZONTAL,
    },
    title: {
      ...TextStyles.screenTitle,
      color: colors.text,
    },
    lastContact: {
      ...TextStyles.monoSmall,
      color: colors.textMuted,
    },
    action: {
      height: ACTION_HEIGHT,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: Spacing.m,
      borderRadius: BorderRadius.l,
      borderWidth: ACTION_BORDER,
    },
    actionLabel: TextStyles.buttonMedium,
  });
