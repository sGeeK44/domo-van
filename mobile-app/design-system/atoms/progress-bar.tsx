import { StyleSheet } from "react-native";
import { GaugeSurface } from "@/design-system/atoms/gauge-surface";
import { BorderRadius } from "@/design-system/tokens";

export type ProgressBarProps = {
  /** 0..1, clamped. */
  ratio: number;
  /** Both colours are the caller's: the bar names no domain. */
  troughColor: string;
  fillColor: string;
  /** Milliseconds; one of `Motion`. */
  duration?: number;
};

const BAR_HEIGHT = 8;

export function ProgressBar({
  ratio,
  troughColor,
  fillColor,
  duration,
}: ProgressBarProps) {
  return (
    <GaugeSurface
      ratio={ratio}
      axis="horizontal"
      fillColor={fillColor}
      radius={BorderRadius.xxs}
      duration={duration}
      testID="progress-bar"
      style={[styles.bar, { backgroundColor: troughColor }]}
    />
  );
}

const styles = StyleSheet.create({
  bar: {
    height: BAR_HEIGHT,
  },
});
