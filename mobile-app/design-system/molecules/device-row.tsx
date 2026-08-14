import type { ComponentProps } from "react";
import {
  Pressable,
  type PressableProps,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { IconSymbol } from "@/design-system/atoms/icon-symbol";
import { useStyles } from "@/design-system/theme/use-styles";
import { useThemeColor } from "@/design-system/theme/use-theme-color";
import {
  BorderRadius,
  FontSize,
  FontWeight,
  Opacity,
  type Palette,
  Spacing,
} from "@/design-system/tokens";

export type DeviceRowProps = {
  icon?: ComponentProps<typeof IconSymbol>["name"];
  name: string;
  subtitle?: string;
  children?: React.ReactNode;
  onPress?: PressableProps["onPress"];
};

export function DeviceRow({
  icon,
  name,
  subtitle,
  children,
  onPress,
}: DeviceRowProps) {
  const colors = useThemeColor();
  const styles = useStyles(makeStyles);
  const Container = onPress ? Pressable : View;

  return (
    <Container style={styles.row} onPress={onPress}>
      {icon && <IconSymbol name={icon} size={20} color={colors.text} />}
      <View style={styles.textContainer}>
        <Text style={styles.name}>{name}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
      {children}
    </Container>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: Spacing.l,
      paddingHorizontal: Spacing.xl,
      paddingVertical: Spacing.l,
      borderRadius: BorderRadius.m,
      backgroundColor: colors.surface,
    },
    textContainer: {
      flex: 1,
    },
    name: {
      color: colors.text,
      fontSize: FontSize.m,
      fontWeight: `${FontWeight.extraBold}`,
    },
    subtitle: {
      color: colors.textMuted,
      fontSize: FontSize.xs,
      opacity: Opacity.subtle,
    },
  });
