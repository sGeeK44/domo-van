import type { ComponentProps } from "react";
import { useState } from "react";
import { type LayoutChangeEvent, StyleSheet, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { IconSymbol } from "@/design-system/atoms/icon-symbol";
import { useStyles } from "@/design-system/theme/use-styles";
import { useThemeColor } from "@/design-system/theme/use-theme-color";
import {
  BorderRadius,
  type Palette,
  Spacing,
  TextStyles,
} from "@/design-system/tokens";

type IconName = ComponentProps<typeof IconSymbol>["name"];

export type SlideToConfirmProps = {
  icon: IconName;
  label: string;
  onConfirm(): void;
  testID?: string;
};

const TRACK_HEIGHT = 80;
const TRACK_BORDER = 1.5;
/** The spec's Spacing.xs left the 68 px knob 3 px too tall for the track — see docs/design-system.md. */
const TRACK_PADDING = Spacing.xxs;
const KNOB_SIZE = 68;
const KNOB_ICON_SIZE = 30;

/** Past two thirds of the travel the gesture reads as deliberate; short of it the knob springs back. */
const CONFIRM_AT = 0.68;

/** The knob sits on the left, so the label is centred on what is left of the track. */
const LABEL_OFFSET = 30;

export function SlideToConfirm({
  icon,
  label,
  onConfirm,
  testID = "slide-to-confirm",
}: SlideToConfirmProps) {
  const colors = useThemeColor();
  const styles = useStyles(makeStyles);
  const [travel, setTravel] = useState(0);
  const offset = useSharedValue(0);
  const grabbedAt = useSharedValue(0);

  const measureTravel = (event: LayoutChangeEvent) =>
    setTravel(
      Math.max(
        0,
        event.nativeEvent.layout.width -
          2 * (TRACK_BORDER + TRACK_PADDING) -
          KNOB_SIZE,
      ),
    );

  const slide = Gesture.Pan()
    .onStart(() => {
      grabbedAt.value = offset.value;
    })
    .onUpdate((event) => {
      offset.value = Math.min(
        Math.max(0, grabbedAt.value + event.translationX),
        travel,
      );
    })
    // success is false when the OS or a takeover cancels the pan: an aborted slide opens nothing.
    .onEnd((_event, success) => {
      const confirmed = travel > 0 && offset.value > travel * CONFIRM_AT;
      offset.value = withSpring(0);
      if (success && confirmed) runOnJS(onConfirm)();
    });

  const knobStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: offset.value }],
  }));

  return (
    <View testID={testID} style={styles.track} onLayout={measureTravel}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
      </View>
      <GestureDetector gesture={slide}>
        <Animated.View testID="slide-knob" style={[styles.knob, knobStyle]}>
          <IconSymbol
            name={icon}
            size={KNOB_ICON_SIZE}
            color={colors.onDanger}
          />
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    track: {
      height: TRACK_HEIGHT,
      justifyContent: "center",
      padding: TRACK_PADDING,
      borderRadius: BorderRadius.xxl,
      borderWidth: TRACK_BORDER,
      borderColor: colors.dangerBorder,
      backgroundColor: colors.surface,
      overflow: "hidden",
    },
    labelRow: {
      ...StyleSheet.absoluteFillObject,
      alignItems: "center",
      justifyContent: "center",
      paddingRight: LABEL_OFFSET,
      pointerEvents: "none",
    },
    label: {
      ...TextStyles.buttonMedium,
      color: colors.textMuted,
    },
    knob: {
      width: KNOB_SIZE,
      height: KNOB_SIZE,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: BorderRadius.xl,
      backgroundColor: colors.danger,
    },
  });
