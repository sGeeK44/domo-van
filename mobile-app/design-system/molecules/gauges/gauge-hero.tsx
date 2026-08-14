import { StyleSheet, Text, View } from "react-native";
import { GaugeSurface } from "@/design-system/atoms/gauge-surface";
import { useStyles } from "@/design-system/theme/use-styles";
import {
  BorderRadius,
  MetricUnitSize,
  Motion,
  type Palette,
  Spacing,
  TextStyles,
} from "@/design-system/tokens";

const CARD_HEIGHT = 186;

export type GaugeHeroProps = {
  ratio: number;
  fillColor: string;
  lineColor: string;
  label: string;
  value: { amount: string; unit: string };
  aside: { value: string; caption: string };
};

export function GaugeHero({
  ratio,
  fillColor,
  lineColor,
  label,
  value,
  aside,
}: GaugeHeroProps) {
  const styles = useStyles(makeStyles);

  return (
    <GaugeSurface
      ratio={ratio}
      axis="vertical"
      fillColor={fillColor}
      lineColor={lineColor}
      radius={BorderRadius.xxxl}
      duration={Motion.fill}
      style={styles.card}
    >
      <View style={styles.headline}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.metric}>
          {value.amount}
          <Text style={styles.unit}>{value.unit}</Text>
        </Text>
      </View>
      <View style={styles.aside}>
        <Text style={styles.asideValue}>{aside.value}</Text>
        <Text style={styles.asideCaption}>{aside.caption}</Text>
      </View>
    </GaugeSurface>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    // The mockup's row-context `align-items: flex-end` bottom-aligns; React Native needs the row spelled out.
    card: {
      height: CARD_HEIGHT,
      backgroundColor: colors.surface,
      flexDirection: "row",
      alignItems: "flex-end",
      justifyContent: "space-between",
      paddingVertical: Spacing.xxxl,
      paddingHorizontal: Spacing.gutter,
    },
    headline: {
      gap: Spacing.m,
    },
    label: {
      ...TextStyles.sectionLabel,
      color: colors.onFillMuted,
    },
    metric: {
      ...TextStyles.metricHuge,
      color: colors.onFill,
    },
    unit: {
      fontSize: MetricUnitSize.metricHuge,
    },
    aside: {
      alignItems: "flex-end",
      gap: Spacing.xs,
    },
    asideValue: {
      ...TextStyles.metricSmall,
      color: colors.onFill,
    },
    asideCaption: {
      ...TextStyles.monoSmall,
      color: colors.onFillMuted,
    },
  });
