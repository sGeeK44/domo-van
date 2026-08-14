import {
  ActivityIndicator,
  Pressable,
  type PressableProps,
  StyleSheet,
  Text,
} from "react-native";
import { useThemeColor } from "@/design-system/theme/use-theme-color";
import {
  BorderRadius,
  FontWeight,
  Opacity,
  Spacing,
} from "@/design-system/tokens";

export type ButtonVariant = "primary" | "secondary";

export type ButtonProps = {
  children: string;
  loading?: boolean;
  variant?: ButtonVariant;
} & Omit<PressableProps, "style">;

export function Button({
  children,
  loading,
  disabled,
  variant = "primary",
  ...props
}: ButtonProps) {
  const colors = useThemeColor();
  const isPrimary = variant === "primary";

  const textColor = isPrimary ? colors.onInverse : colors.text;
  const borderColor = colors.text;

  return (
    <Pressable
      style={[
        styles.button,
        isPrimary
          ? { backgroundColor: colors.inverse }
          : {
              borderColor: `${borderColor}${Math.round(Opacity.ghost * 255)
                .toString(16)
                .padStart(2, "0")}`,
              borderWidth: 1,
            },
        (disabled || loading) && { opacity: Opacity.subtle },
      ]}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <ActivityIndicator size="small" color={textColor} />
      ) : (
        <Text
          style={[
            styles.text,
            {
              color: textColor,
              fontWeight: isPrimary
                ? `${FontWeight.extraBold}`
                : `${FontWeight.bold}`,
            },
          ]}
        >
          {children}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: Spacing.m,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.s,
    alignItems: "center",
    justifyContent: "center",
  },
  text: {},
});
