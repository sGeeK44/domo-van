import { BorderRadius, FontWeight, Opacity, Spacing, TextColors } from "@/design-system/theme";
import { useThemeColor } from "@/hooks/use-theme-color";
import { ActivityIndicator, Pressable, StyleSheet, Text, type PressableProps } from "react-native";

export type ButtonVariant = "primary" | "secondary";

export type ButtonProps = {
  children: string;
  loading?: boolean;
  variant?: ButtonVariant;
} & Omit<PressableProps, "style">;

export function Button({ children, loading, disabled, variant = "primary", ...props }: ButtonProps) {
  const colors = useThemeColor();
  const isPrimary = variant === "primary";

  const textColor = isPrimary ? TextColors.dark : TextColors.primary;

  return (
    <Pressable
      style={[
        styles.button,
        isPrimary
          ? { backgroundColor: colors.primary["500"] }
          : { borderColor: `rgba(255,255,255,${Opacity.ghost})`, borderWidth: 1 },
        (disabled || loading) && { opacity: Opacity.subtle },
      ]}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <ActivityIndicator size="small" color={textColor} />
      ) : (
        <Text style={[styles.text, { color: textColor, fontWeight: isPrimary ? `${FontWeight.extraBold}` : `${FontWeight.bold}` }]}>
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
