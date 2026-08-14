import { Pressable, StyleSheet, Text, View } from "react-native";
import { clampRatio } from "@/design-system/atoms/gauge-geometry";
import { GaugeSurface } from "@/design-system/atoms/gauge-surface";
import { IconSymbol } from "@/design-system/atoms/icon-symbol";
import { useStyles } from "@/design-system/theme/use-styles";
import { useThemeColor } from "@/design-system/theme/use-theme-color";
import {
  BorderRadius,
  Motion,
  type Palette,
  Spacing,
  TextStyles,
} from "@/design-system/tokens";

/** A switched-off zone still shows where its level sits, dimmed down to a hint of it. */
const INERT_FILL_SCALE = 0.45;

const CONTROL_SIZE = 48;
const CONTROL_BORDER = 1.5;
const POWER_ICON_SIZE = 24;

/** The mockup's stepper glyph, the one size no `TextStyles` entry names. */
const STEPPER_GLYPH = {
  fontFamily: "Archivo_700Bold",
  fontSize: 26,
  lineHeight: 26,
} as const;

export type GaugeSetpointRowProps = {
  ratio: number;
  setpointRatio: number;
  /** The live fill; ignored when inert. */
  fillColor: string;
  markerColor: string;
  label: string;
  /** `metricMedium`; the degree sign comes from the caller. */
  value: string;
  caption: string;
  /** The zone is switched off: dimmed fill, no setpoint marker, muted ink — the steppers stay live. */
  inert?: boolean;
  /** The target sits on a clamp bound: the step it offers does not exist. */
  decreaseDisabled?: boolean;
  increaseDisabled?: boolean;
  /** A screen holding four zones tells them apart with this. */
  testID?: string;
  onDecrease(): void;
  onIncrease(): void;
  onTogglePower(): void;
};

export function GaugeSetpointRow({
  ratio,
  setpointRatio,
  fillColor,
  markerColor,
  label,
  value,
  caption,
  inert = false,
  decreaseDisabled = false,
  increaseDisabled = false,
  testID,
  onDecrease,
  onIncrease,
  onTogglePower,
}: GaugeSetpointRowProps) {
  const colors = useThemeColor();
  const styles = useStyles(makeStyles);
  const muted = inert && styles.mutedInk;

  return (
    <GaugeSurface
      ratio={inert ? clampRatio(ratio) * INERT_FILL_SCALE : ratio}
      axis="horizontal"
      fillColor={inert ? colors.off : fillColor}
      // the target is still held while hidden, so switching back on reveals it in place instead of sweeping in from 0
      markerRatio={setpointRatio}
      markerColor={inert ? undefined : markerColor}
      radius={BorderRadius.xl}
      duration={Motion.fill}
      testID={testID}
      style={styles.surface}
    >
      <View testID="setpoint-content" style={styles.content}>
        <View style={styles.readings}>
          <Text style={[styles.label, muted]}>{label}</Text>
          <Text style={[styles.value, muted]}>{value}</Text>
          <Text style={[styles.caption, muted]}>{caption}</Text>
        </View>
        <View style={styles.controls}>
          <Stepper
            testID="setpoint-decrease"
            glyph="−"
            disabled={decreaseDisabled}
            onPress={onDecrease}
          />
          <Stepper
            testID="setpoint-increase"
            glyph="+"
            disabled={increaseDisabled}
            onPress={onIncrease}
          />
          <Pressable
            testID="setpoint-power"
            style={[styles.control, inert ? styles.powerOff : styles.powerOn]}
            onPress={onTogglePower}
          >
            <IconSymbol
              name="power-settings-new"
              size={POWER_ICON_SIZE}
              color={inert ? colors.textMuted : colors.onInverse}
            />
          </Pressable>
        </View>
      </View>
    </GaugeSurface>
  );
}

type StepperProps = {
  testID: string;
  glyph: string;
  /** The step is out of range: dimmed, and pressing it sends nothing. */
  disabled: boolean;
  onPress: () => void;
};

function Stepper({ testID, glyph, disabled, onPress }: StepperProps) {
  const styles = useStyles(makeStyles);

  return (
    <Pressable
      testID={testID}
      style={[styles.control, disabled ? styles.stepperOff : styles.stepperOn]}
      disabled={disabled}
      onPress={onPress}
    >
      <Text style={[styles.glyph, disabled && styles.glyphOff]}>{glyph}</Text>
    </Pressable>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    surface: {
      flex: 1,
      backgroundColor: colors.surface,
    },
    content: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: Spacing.xl,
      paddingHorizontal: Spacing.gutter,
      paddingVertical: Spacing.xxl,
    },
    readings: {
      gap: Spacing.s,
    },
    label: {
      ...TextStyles.cardLabel,
      color: colors.onFill,
    },
    value: {
      ...TextStyles.metricMedium,
      color: colors.onFill,
    },
    caption: {
      ...TextStyles.monoStrong,
      color: colors.onFillMuted,
    },
    mutedInk: {
      color: colors.textMuted,
    },
    controls: {
      flexDirection: "row",
      gap: Spacing.s,
    },
    control: {
      width: CONTROL_SIZE,
      height: CONTROL_SIZE,
      borderRadius: BorderRadius.m,
      alignItems: "center",
      justifyContent: "center",
    },
    stepperOn: {
      backgroundColor: colors.onFillSurface,
    },
    stepperOff: {
      backgroundColor: colors.off,
    },
    powerOn: {
      backgroundColor: colors.inverse,
    },
    powerOff: {
      borderWidth: CONTROL_BORDER,
      borderColor: colors.textMuted,
    },
    glyph: {
      ...STEPPER_GLYPH,
      color: colors.onFill,
    },
    glyphOff: {
      color: colors.dash,
    },
  });
