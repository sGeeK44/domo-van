import { StyleSheet, Text, View } from "react-native";
import { GaugeSurface } from "@/design-system/atoms/gauge-surface";
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

/** Negative leading (cardLabel 13/13, metricLarge 64/57.6) makes the text box shorter than the glyphs: without this the blocks touch. */
const LEADING_GAP = Spacing.s;

export type GaugeColumnProps = {
  ratio: number;
  fillColor: string;
  /** The meniscus ink. Ignored while draining, which draws it in `danger`. */
  lineColor: string;
  label: string;
  caption: string;
  value: { amount: string; unit: string };
  footer: string;
  /** Dimming the *sibling* tank while this one drains is the caller's layout call (#6), not this component's. */
  draining?: boolean;
  /** A screen holding two tanks tells them apart with this. */
  testID?: string;
};

export function GaugeColumn({
  ratio,
  fillColor,
  lineColor,
  label,
  caption,
  value,
  footer,
  draining = false,
  testID,
}: GaugeColumnProps) {
  const colors = useThemeColor();
  const styles = useStyles(makeStyles);

  return (
    <GaugeSurface
      ratio={ratio}
      axis="vertical"
      fillColor={fillColor}
      lineColor={draining ? colors.danger : lineColor}
      radius={BorderRadius.xxxl}
      duration={draining ? Motion.drain : Motion.fill}
      outline={draining ? { color: colors.danger } : undefined}
      testID={testID}
      style={styles.column}
    >
      <View>
        <Text style={styles.label}>{label}</Text>
        <Text
          style={[
            styles.caption,
            { color: draining ? colors.danger : colors.textMuted },
          ]}
        >
          {caption}
        </Text>
      </View>
      <View>
        <Text style={styles.value}>
          {value.amount}
          <Text style={styles.unit}>{value.unit}</Text>
        </Text>
        <Text
          style={[
            styles.footer,
            { color: draining ? colors.danger : colors.onFillMuted },
          ]}
        >
          {footer}
        </Text>
      </View>
    </GaugeSurface>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    column: {
      flex: 1,
      justifyContent: "space-between",
      paddingVertical: Spacing.xxxl,
      paddingHorizontal: Spacing.xxl,
      backgroundColor: colors.surface,
    },
    label: {
      ...TextStyles.cardLabel,
      color: colors.text,
      marginBottom: LEADING_GAP,
    },
    caption: TextStyles.monoSmall,
    value: {
      ...TextStyles.metricLarge,
      color: colors.onFill,
      marginBottom: LEADING_GAP,
    },
    unit: {
      fontSize: MetricUnitSize.metricLarge,
    },
    footer: TextStyles.monoValue,
  });
