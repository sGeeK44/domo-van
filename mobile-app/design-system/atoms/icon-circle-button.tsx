import { Pressable, StyleSheet, View, type PressableProps } from "react-native";
import { Opacity } from "@/design-system/theme";
import { IconSymbol } from "@/design-system/atoms/icon-symbol";
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
  iconColor = "#FFFFFF",
  children,
  ...props
}: IconCircleButtonProps) {
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
        <IconSymbol name={icon} size={iconSize} color={iconColor} />
        {children}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    borderRadius: 999,
  },
  circle: {
    backgroundColor: `rgba(255, 255, 255, ${Opacity.muted})`,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
});
