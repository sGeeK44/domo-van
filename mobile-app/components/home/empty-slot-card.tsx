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
  type Palette,
  Spacing,
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
        <IconSymbol name="add" size={24} color={colors.textMuted} />
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.hint}>Aucun module</Text>
      </View>
    </Pressable>
  );
}

const getStyles = (colors: Palette) =>
  StyleSheet.create({
    card: {
      minHeight: 100,
      borderRadius: BorderRadius.xl,
      borderWidth: 2,
      borderStyle: "dashed",
      borderColor: colors.dash,
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
      color: colors.text,
      fontSize: FontSize.m,
      fontWeight: FontWeight.semiBold,
    },
    hint: {
      color: colors.textMuted,
      fontSize: FontSize.xs,
    },
  });
