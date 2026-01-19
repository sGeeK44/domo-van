import { Pressable, StyleSheet, View, type PressableProps } from "react-native";
import { type ThemeColors } from "@/design-system/theme";
import { IconSymbol } from "@/design-system/atoms/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";
import type { ComponentProps } from "react";

export type IconCircleButtonProps = {
  icon: ComponentProps<typeof IconSymbol>["name"];
  size?: number;
  iconSize?: number;
  iconColor?: string;
  children?: React.ReactNode;
} & Omit<PressableProps, "style">;

export function IconCircleButton({
  icon,
  size = 40,
  iconSize = 18,
  iconColor,
  children,
  ...props
}: IconCircleButtonProps) {
  const colors = useThemeColor();
  const styles = getStyles(colors);
  const resolvedIconColor = iconColor ?? colors.text.primary;

  return (
    <Pressable style={styles.pressable} hitSlop={10} {...props}>
      <View
        style={[
          styles.circle,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
          },
        ]}
      >
        <IconSymbol name={icon} size={iconSize} color={resolvedIconColor} />
        {children}
      </View>
    </Pressable>
  );
}

const getStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    pressable: {
      borderRadius: 999,
    },
    circle: {
      backgroundColor: colors.background.secondary,
      justifyContent: "center",
      alignItems: "center",
      position: "relative",
    },
  });
