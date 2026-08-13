import { Pressable, StyleSheet, Text } from "react-native";
import {
  BorderRadius,
  FontSize,
  FontWeight,
  Opacity,
  Spacing,
  type ThemeColors,
  useThemeColor,
} from "@/design-system";
import type { ModuleDescriptor } from "@/domain/modules/ModuleDescriptor";

export type FreeSlotRowProps = {
  module: ModuleDescriptor;
  onPress: () => void;
};

export function FreeSlotRow({ module, onPress }: FreeSlotRowProps) {
  const colors = useThemeColor();
  const styles = getStyles(colors);

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

const getStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    row: {
      gap: Spacing.xxs,
      padding: Spacing.xl,
      borderRadius: BorderRadius.m,
      borderWidth: 1,
      borderStyle: "dashed",
      borderColor: colors.neutral["500"],
    },
    title: {
      color: colors.text.primary,
      fontSize: FontSize.m,
      fontWeight: `${FontWeight.medium}`,
      opacity: Opacity.subtle,
    },
    subtitle: {
      color: colors.text.secondary,
      fontSize: FontSize.xs,
    },
  });
