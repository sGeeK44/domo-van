import {
  Pressable,
  type StyleProp,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from "react-native";
import {
  BorderRadius,
  FontSize,
  FontWeight,
  IconSymbol,
  Opacity,
  Spacing,
  type ThemeColors,
  useThemeColor,
} from "@/design-system";

export type EmptySlotCardProps = {
  title: string;
  onPress: () => void;
  /** How much room the card takes is the caller's layout, not the card's. */
  style?: StyleProp<ViewStyle>;
};

export function EmptySlotCard({ title, onPress, style }: EmptySlotCardProps) {
  const colors = useThemeColor();
  const styles = getStyles(colors);

  return (
    <Pressable
      accessibilityRole="button"
      style={({ pressed }) => [styles.card, style, pressed && styles.pressed]}
      onPress={onPress}
    >
      <View style={styles.body}>
        <IconSymbol name="add" size={24} color={colors.text.secondary} />
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.hint}>Aucun module</Text>
      </View>
    </Pressable>
  );
}

const getStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    card: {
      minHeight: 100,
      borderRadius: BorderRadius.l,
      borderWidth: 2,
      borderStyle: "dashed",
      borderColor: colors.neutral["500"],
      justifyContent: "center",
      alignItems: "center",
      padding: Spacing.xxl,
    },
    pressed: {
      opacity: Opacity.medium,
    },
    body: {
      alignItems: "center",
      gap: Spacing.xxs,
    },
    title: {
      color: colors.text.primary,
      fontSize: FontSize.m,
      fontWeight: FontWeight.semiBold,
    },
    hint: {
      color: colors.text.secondary,
      fontSize: FontSize.xs,
    },
  });
