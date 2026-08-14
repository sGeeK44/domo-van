import type { ComponentProps } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { GaugeSurface } from "@/design-system/atoms/gauge-surface";
import { IconSymbol } from "@/design-system/atoms/icon-symbol";
import { useStyles } from "@/design-system/theme/use-styles";
import { useThemeColor } from "@/design-system/theme/use-theme-color";
import {
  BorderRadius,
  MetricUnitSize,
  Motion,
  type Palette,
  Spacing,
  TextStyles,
} from "@/design-system/tokens";

type IconName = ComponentProps<typeof IconSymbol>["name"];

/** `hatched` covers offline and empty slot alike: they differ only in the copy and the trailing element. */
export type GaugeRowState = "filled" | "hatched";

export type GaugeRowSubtitleTone = "onFill" | "muted" | "danger";

export type GaugeRowAction = {
  icon: IconName;
  label: string;
  tone: "danger" | "muted";
  onPress(): void;
};

export type GaugeRowProps = {
  ratio: number;
  fillColor: string;
  lineColor: string;
  icon: IconName;
  label: string;
  subtitle: string;
  subtitleTone?: GaugeRowSubtitleTone;
  value?: { amount: string; unit: string };
  action?: GaugeRowAction;
  trailingAdd?: boolean;
  state?: GaugeRowState;
  /** A screen holding several rows tells them apart with this. */
  testID?: string;
  onPress?(): void;
};

const ROW_HEIGHT = 96;
const ICON_SIZE = 28;
const ADD_SIZE = 24;
const ACTION_HEIGHT = 48;
const ACTION_ICON_SIZE = 18;
const ACTION_BORDER = 1.5;

export function GaugeRow({
  ratio,
  fillColor,
  lineColor,
  icon,
  label,
  subtitle,
  subtitleTone = "onFill",
  value,
  action,
  trailingAdd = false,
  state = "filled",
  testID,
  onPress,
}: GaugeRowProps) {
  const colors = useThemeColor();
  const styles = useStyles(makeStyles);

  const hatched = state === "hatched";
  const ink = hatched ? colors.textSecondary : colors.onFill;
  const iconInk = hatched ? colors.textMuted : colors.onFill;
  const subtitleInk = {
    onFill: colors.onFillMuted,
    muted: colors.textMuted,
    danger: colors.danger,
  }[subtitleTone];
  const actionInk =
    action?.tone === "danger" ? colors.danger : colors.textMuted;

  const card = (
    <GaugeSurface
      ratio={ratio}
      axis="horizontal"
      fillColor={fillColor}
      lineColor={lineColor}
      hatched={hatched}
      radius={BorderRadius.xxl}
      duration={Motion.fill}
      testID={testID}
      style={styles.card}
    >
      <View style={styles.content}>
        <IconSymbol name={icon} size={ICON_SIZE} color={iconInk} />
        <View style={styles.texts}>
          <Text style={[styles.label, { color: ink }]}>{label}</Text>
          <Text
            testID="gauge-row-subtitle"
            style={[styles.subtitle, { color: subtitleInk }]}
          >
            {subtitle}
          </Text>
        </View>
        {/* A hatched row has no reading: a last known value is not a measurement. */}
        {value && !hatched && (
          <Text testID="gauge-row-value" style={[styles.value, { color: ink }]}>
            {value.amount}
            <Text style={styles.unit}>{value.unit}</Text>
          </Text>
        )}
        {action && (
          <Pressable
            testID="gauge-row-action"
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
        )}
        {trailingAdd && (
          <IconSymbol name="add" size={ADD_SIZE} color={colors.textMuted} />
        )}
      </View>
    </GaugeSurface>
  );

  return onPress ? (
    <Pressable testID="gauge-row" onPress={onPress}>
      {card}
    </Pressable>
  ) : (
    card
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    card: {
      height: ROW_HEIGHT,
      backgroundColor: colors.surface,
    },
    // Relative, so the whole content layer stacks above the absolutely-positioned fill.
    content: {
      position: "relative",
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: Spacing.xl,
      paddingHorizontal: Spacing.gutter,
    },
    texts: {
      flex: 1,
      gap: Spacing.s,
    },
    label: TextStyles.cardLabel,
    subtitle: TextStyles.mono,
    value: {
      ...TextStyles.metric,
      textAlign: "right",
    },
    unit: {
      fontSize: MetricUnitSize.metric,
    },
    action: {
      height: ACTION_HEIGHT,
      flexDirection: "row",
      alignItems: "center",
      gap: Spacing.s,
      paddingHorizontal: Spacing.xxl,
      borderRadius: BorderRadius.m,
      borderWidth: ACTION_BORDER,
    },
    actionLabel: TextStyles.buttonSmall,
  });
