import { Pressable, StyleSheet, Text, View } from "react-native";
import { useStyles } from "@/design-system/theme/use-styles";
import {
  BorderRadius,
  type Palette,
  Spacing,
  TextStyles,
} from "@/design-system/tokens";

const SEGMENT_HEIGHT = 36;

export type SegmentedControlOption<T extends string> = {
  value: T;
  label: string;
};

export type SegmentedControlProps<T extends string> = {
  label: string;
  options: readonly SegmentedControlOption<T>[];
  value: T;
  onChange: (value: T) => void;
};

export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  const styles = useStyles(makeStyles);

  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.rail}>
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable
              key={option.value}
              testID={`segment-${option.value}`}
              style={[styles.segment, selected && styles.segmentSelected]}
              // pressing the selected option reports nothing: it is not a change
              onPress={() => !selected && onChange(option.value)}
            >
              <Text
                style={[
                  styles.segmentLabel,
                  selected ? styles.selectedInk : styles.idleInk,
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: Spacing.xl,
      paddingVertical: Spacing.xl,
      paddingHorizontal: Spacing.xxl,
      borderRadius: BorderRadius.l,
      backgroundColor: colors.surface,
    },
    label: {
      ...TextStyles.rowTitle,
      flex: 1,
      color: colors.text,
    },
    rail: {
      flexDirection: "row",
      gap: Spacing.xxs,
      padding: Spacing.xxs,
      borderRadius: BorderRadius.m,
      backgroundColor: colors.inset,
    },
    segment: {
      height: SEGMENT_HEIGHT,
      paddingHorizontal: Spacing.xl,
      borderRadius: BorderRadius.s,
      alignItems: "center",
      justifyContent: "center",
    },
    segmentSelected: {
      backgroundColor: colors.inverse,
    },
    segmentLabel: {
      ...TextStyles.buttonSmall,
    },
    selectedInk: {
      color: colors.onInverse,
    },
    idleInk: {
      color: colors.textMuted,
    },
  });
