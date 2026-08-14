import {
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
} from "react-native";
import { Button } from "@/design-system/atoms/button";
import { useThemeColor } from "@/design-system/theme/use-theme-color";
import {
  BorderRadius,
  FontSize,
  FontWeight,
  Opacity,
  type Palette,
  Spacing,
} from "@/design-system/tokens";

export type FormFieldProps = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  buttonLabel: string;
  onButtonPress: () => void;
  loading?: boolean;
  inputProps?: Omit<
    TextInputProps,
    "value" | "onChangeText" | "placeholder" | "style"
  >;
};

export function FormField({
  label,
  value,
  onChangeText,
  placeholder,
  buttonLabel,
  onButtonPress,
  loading,
  inputProps,
}: FormFieldProps) {
  const colors = useThemeColor();
  const styles = getStyles(colors);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        style={styles.input}
        {...inputProps}
      />
      <Button onPress={onButtonPress} loading={loading}>
        {buttonLabel}
      </Button>
    </View>
  );
}

const getStyles = (colors: Palette) =>
  StyleSheet.create({
    container: {
      gap: Spacing.s,
      padding: Spacing.l,
      borderRadius: BorderRadius.m,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    label: {
      color: colors.text,
      fontSize: FontSize.xs,
      opacity: Opacity.medium,
      fontWeight: `${FontWeight.extraBold}`,
    },
    input: {
      color: colors.text,
      paddingVertical: Spacing.m,
      paddingHorizontal: Spacing.l,
      borderRadius: BorderRadius.s,
      borderWidth: 1,
      borderColor: colors.dash,
      backgroundColor: colors.screen,
    },
  });
