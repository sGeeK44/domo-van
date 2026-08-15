import type { ComponentProps } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  BorderRadius,
  IconSymbol,
  type Palette,
  Spacing,
  TextStyles,
  useStyles,
  useThemeColor,
} from "@/design-system";

type IconName = ComponentProps<typeof IconSymbol>["name"];

const BUTTON_HEIGHT = 56;
const BUTTON_BORDER = 1.5;
const ICON_SIZE = 20;

export type HeaterPresetsProps = {
  /** Night mode is a preset, not a toggle: this reports it, and a second press re-sends it. */
  nightMode: boolean;
  onNightMode(): void;
  onStopAll(): void;
};

export function HeaterPresets({
  nightMode,
  onNightMode,
  onStopAll,
}: HeaterPresetsProps) {
  const { t } = useTranslation();
  const styles = useStyles(makeStyles);

  return (
    <View style={styles.bar}>
      <PresetButton
        testID="preset-night-mode"
        icon="bedtime"
        label={t("heater.presets.nightMode")}
        active={nightMode}
        onPress={onNightMode}
      />
      <PresetButton
        testID="preset-stop-all"
        icon="power-settings-new"
        label={t("heater.presets.stopAll")}
        onPress={onStopAll}
      />
    </View>
  );
}

type PresetButtonProps = {
  testID: string;
  icon: IconName;
  label: string;
  /** A preset that reports a state; a pure command passes none and exposes none. */
  active?: boolean;
  onPress(): void;
};

function PresetButton({
  testID,
  icon,
  label,
  active,
  onPress,
}: PresetButtonProps) {
  const colors = useThemeColor();
  const styles = useStyles(makeStyles);
  const ink = active ? colors.onInverse : colors.textMuted;

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      aria-selected={active}
      style={[styles.button, active ? styles.buttonActive : styles.buttonIdle]}
      onPress={onPress}
    >
      <IconSymbol name={icon} size={ICON_SIZE} color={ink} />
      <Text style={[styles.label, { color: ink }]}>{label}</Text>
    </Pressable>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    bar: {
      flexDirection: "row",
      gap: Spacing.m,
    },
    button: {
      flex: 1,
      height: BUTTON_HEIGHT,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: Spacing.s,
      borderRadius: BorderRadius.l,
      borderWidth: BUTTON_BORDER,
    },
    buttonActive: {
      backgroundColor: colors.inverse,
      borderColor: colors.inverse,
    },
    buttonIdle: {
      borderColor: colors.border,
    },
    label: {
      ...TextStyles.labelStrong,
    },
  });
