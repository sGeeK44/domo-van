import { useMemo } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import {
  BorderRadius,
  FontSize,
  FontWeight,
  Opacity,
  type Palette,
  Spacing,
  useThemeColor,
} from "@/design-system";
import type { ModuleDescriptor } from "@/domain/modules/ModuleDescriptor";

export type FreeSlotRowProps = {
  module: ModuleDescriptor;
  onPress: () => void;
};

export function FreeSlotRow({ module, onPress }: FreeSlotRowProps) {
  const colors = useThemeColor();
  const styles = useMemo(() => getStyles(colors), [colors]);

  return (
    <Pressable
      testID={`free-slot-${module.key}`}
      style={styles.row}
      onPress={onPress}
    >
      <Text style={styles.title}>{module.displayName}</Text>
      <Text style={styles.subtitle}>Emplacement libre · appairer</Text>
    </Pressable>
  );
}

const getStyles = (colors: Palette) =>
  StyleSheet.create({
    row: {
      gap: Spacing.xxs,
      padding: Spacing.xl,
      borderRadius: BorderRadius.m,
      borderWidth: 1,
      borderStyle: "dashed",
      borderColor: colors.dash,
    },
    title: {
      color: colors.text,
      fontSize: FontSize.m,
      fontWeight: `${FontWeight.medium}`,
      opacity: Opacity.subtle,
    },
    subtitle: {
      color: colors.textMuted,
      fontSize: FontSize.xs,
    },
  });
