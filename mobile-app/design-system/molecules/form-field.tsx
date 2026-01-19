import { StyleSheet, Text, TextInput, View, type TextInputProps } from "react-native";
import { Button } from "@/design-system/atoms/button";
import { BorderRadius, FontSize, FontWeight, Opacity, Spacing, TextColors } from "@/design-system/theme";

export type FormFieldProps = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  buttonLabel: string;
  onButtonPress: () => void;
  loading?: boolean;
  inputProps?: Omit<TextInputProps, "value" | "onChangeText" | "placeholder" | "style">;
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
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={`rgba(255,255,255,${Opacity.faint})`}
        style={styles.input}
        {...inputProps}
      />
      <Button onPress={onButtonPress} loading={loading}>
        {buttonLabel}
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.s,
    padding: Spacing.l,
    borderRadius: BorderRadius.m,
    backgroundColor: `rgba(255,255,255,${Opacity.hint})`,
    borderWidth: 1,
    borderColor: `rgba(255,255,255,${Opacity.overlay})`,
  },
  label: {
    color: TextColors.primary,
    fontSize: FontSize.xs,
    opacity: Opacity.medium,
    fontWeight: `${FontWeight.extraBold}`,
  },
  input: {
    color: TextColors.primary,
    paddingVertical: Spacing.m,
    paddingHorizontal: Spacing.l,
    borderRadius: BorderRadius.s,
    borderWidth: 1,
    borderColor: `rgba(255,255,255,${Opacity.dim})`,
    backgroundColor: "rgba(0,0,0,0.15)",
  },
});
