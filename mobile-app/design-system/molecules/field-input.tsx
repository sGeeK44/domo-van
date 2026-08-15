import {
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
} from "react-native";
import type { FieldReadoutProps } from "@/design-system/molecules/field-readout";
import { useStyles } from "@/design-system/theme/use-styles";
import { useThemeColor } from "@/design-system/theme/use-theme-color";
import {
  BorderRadius,
  type Palette,
  Spacing,
  TextStyles,
} from "@/design-system/tokens";

const BOX_HEIGHT = 56;
const BOX_BORDER = 1.5;

export type FieldInputProps = FieldReadoutProps & {
  onChangeText: (text: string) => void;
  /** The mockup's unused slot: a value the form refuses to send. */
  invalid?: boolean;
  inputProps?: Omit<TextInputProps, "value" | "onChangeText" | "style">;
};

export function FieldInput({
  label,
  value,
  unit,
  onChangeText,
  invalid = false,
  testID = "field-input",
  inputProps,
}: FieldInputProps) {
  const colors = useThemeColor();
  const styles = useStyles(makeStyles);

  return (
    <View testID={testID} style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View
        testID={`${testID}-box`}
        style={[styles.box, invalid ? styles.boxInvalid : styles.boxIdle]}
      >
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          {...inputProps}
        />
        {unit && <Text style={styles.unit}>{unit}</Text>}
      </View>
    </View>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    // flex, so a row of three fields splits in three without the caller wrapping each one
    field: {
      flex: 1,
      gap: Spacing.xs,
    },
    label: {
      ...TextStyles.monoLabel,
      color: colors.textMuted,
    },
    box: {
      flexDirection: "row",
      alignItems: "center",
      height: BOX_HEIGHT,
      borderRadius: BorderRadius.m,
      backgroundColor: colors.inset,
      paddingHorizontal: Spacing.xl,
      gap: Spacing.s,
      borderWidth: BOX_BORDER,
    },
    boxIdle: {
      borderColor: "transparent",
    },
    boxInvalid: {
      borderColor: colors.danger,
    },
    input: {
      ...TextStyles.monoReadout,
      flex: 1,
      color: colors.text,
      padding: 0,
    },
    unit: {
      ...TextStyles.monoSmall,
      color: colors.textMuted,
    },
  });
