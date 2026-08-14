import { StyleSheet, Text, View } from "react-native";
import { useStyles } from "@/design-system/theme/use-styles";
import {
  BorderRadius,
  type Palette,
  Spacing,
  TextStyles,
} from "@/design-system/tokens";

export type StatTileProps = {
  label: string;
  /** Already formatted, unit included: the tile computes nothing. */
  value: string;
  testID?: string;
};

/** One height for the mockup's three accidental sizes (64 / 74 / 66); the strips read as one family. */
const TILE_HEIGHT = 68;

/** monoLabel 11/11 and metricTile 20/20 leave no leading of their own: without this the two boxes touch. */
const LEADING_GAP = Spacing.xxs + 1;

export function StatTile({
  label,
  value,
  testID = "stat-tile",
}: StatTileProps) {
  const styles = useStyles(makeStyles);

  return (
    <View testID={testID} style={styles.tile}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    tile: {
      flex: 1,
      height: TILE_HEIGHT,
      borderRadius: BorderRadius.l,
      alignItems: "center",
      justifyContent: "center",
      gap: LEADING_GAP,
      backgroundColor: colors.surface,
    },
    label: {
      ...TextStyles.monoLabel,
      color: colors.textMuted,
    },
    value: {
      ...TextStyles.metricTile,
      color: colors.text,
    },
  });
