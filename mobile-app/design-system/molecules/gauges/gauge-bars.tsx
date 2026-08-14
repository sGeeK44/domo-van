import {
  type StyleProp,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from "react-native";
import { GaugeSurface } from "@/design-system/atoms/gauge-surface";
import { useStyles } from "@/design-system/theme/use-styles";
import {
  BorderRadius,
  Motion,
  type Palette,
  Spacing,
  TextStyles,
} from "@/design-system/tokens";

export type GaugeBar = {
  id: string;
  /** The caller marks the minimum here ("C4 min"): the cluster ranks nothing. */
  label: string;
  ratio: number;
  value: string;
};

export type GaugeBarsProps = {
  bars: GaugeBar[];
  fillColor: string;
  /** How tall the cluster is belongs to the caller's layout, not to the cluster. */
  style?: StyleProp<ViewStyle>;
};

export function GaugeBars({ bars, fillColor, style }: GaugeBarsProps) {
  const styles = useStyles(makeStyles);

  return (
    <View style={[styles.cluster, style]}>
      {bars.map((bar) => (
        // No lineColor: a bar in a cluster draws no meniscus.
        <GaugeSurface
          key={bar.id}
          ratio={bar.ratio}
          axis="vertical"
          fillColor={fillColor}
          radius={BorderRadius.m}
          duration={Motion.fill}
          style={styles.bar}
        >
          <Text style={styles.value}>{bar.value}</Text>
          <Text style={styles.label}>{bar.label}</Text>
        </GaugeSurface>
      ))}
    </View>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    cluster: {
      flexDirection: "row",
      gap: Spacing.s,
    },
    bar: {
      flex: 1,
      backgroundColor: colors.surface,
      justifyContent: "flex-end",
      alignItems: "center",
      paddingVertical: Spacing.m,
    },
    value: {
      ...TextStyles.monoValue,
      color: colors.onFill,
    },
    label: {
      ...TextStyles.monoLabel,
      color: colors.onFillMuted,
      marginTop: Spacing.xxs + 1,
    },
  });
