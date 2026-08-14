import type { ComponentProps } from "react";
import { Pressable, type PressableProps, StyleSheet, View } from "react-native";
import { IconSymbol } from "@/design-system/atoms/icon-symbol";
import { useStyles } from "@/design-system/theme/use-styles";
import { useThemeColor } from "@/design-system/theme/use-theme-color";
import { type Palette } from "@/design-system/tokens";

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
  const styles = useStyles(makeStyles);
  const resolvedIconColor = iconColor ?? colors.text;

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
        {/* only the affordance dims; children carry status, which stays legible */}
        <View style={props.disabled === true && styles.inert}>
          <IconSymbol name={icon} size={iconSize} color={resolvedIconColor} />
        </View>
        {children}
      </View>
    </Pressable>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    pressable: {
      borderRadius: 999,
    },
    circle: {
      backgroundColor: colors.surface,
      justifyContent: "center",
      alignItems: "center",
      position: "relative",
    },
    inert: {
      opacity: 0.4,
    },
  });
