import { Pressable, StyleSheet, Text, View, type PressableProps } from "react-native";
import { IconSymbol } from "@/design-system/atoms/icon-symbol";
import { BorderRadius, FontSize, FontWeight, Opacity, Spacing, TextColors } from "@/design-system/theme";
import type { ComponentProps } from "react";

export type DeviceRowProps = {
  icon?: ComponentProps<typeof IconSymbol>["name"];
  name: string;
  subtitle?: string;
  children?: React.ReactNode;
  onPress?: PressableProps["onPress"];
};

export function DeviceRow({ icon, name, subtitle, children, onPress }: DeviceRowProps) {
  const Container = onPress ? Pressable : View;

  return (
    <Container style={styles.row} onPress={onPress}>
      {icon && (
        <IconSymbol name={icon} size={20} color={TextColors.primary} />
      )}
      <View style={styles.textContainer}>
        <Text style={styles.name}>{name}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
      {children}
    </Container>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.l,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.l,
    borderRadius: BorderRadius.m,
    backgroundColor: `rgba(255,255,255,${Opacity.overlay})`,
  },
  textContainer: {
    flex: 1,
  },
  name: {
    color: TextColors.primary,
    fontSize: FontSize.m,
    fontWeight: `${FontWeight.extraBold}`,
  },
  subtitle: {
    color: TextColors.primary,
    fontSize: FontSize.xs,
    opacity: Opacity.subtle,
  },
});
