import { StyleSheet, Text, View } from "react-native";
import { useStyles } from "@/design-system/theme/use-styles";
import { type Palette, Spacing, TextStyles } from "@/design-system/tokens";

export type FieldReadoutProps = {
  label: string;
  /** Already formatted: the field converts nothing. */
  value: string;
  unit?: string;
};

export function FieldReadout({ label, value, unit }: FieldReadoutProps) {
  const styles = useStyles(makeStyles);

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.reading}>
        <Text style={styles.value}>{value}</Text>
        {unit && <Text style={styles.unit}>{unit}</Text>}
      </View>
    </View>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    // flex, so a row of three fields splits in three without the caller wrapping each one
    field: {
      flex: 1,
      gap: Spacing.xs,
    },
    label: {
      ...TextStyles.monoLabel,
      color: colors.textMuted,
    },
    reading: {
      flexDirection: "row",
      alignItems: "baseline",
      gap: Spacing.xxs,
    },
    value: {
      ...TextStyles.monoReadout,
      color: colors.text,
    },
    unit: {
      ...TextStyles.monoSmall,
      color: colors.textMuted,
    },
  });
