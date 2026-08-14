import { type ReactNode, useEffect, useRef } from "react";
import { type StyleProp, StyleSheet, View, type ViewStyle } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import {
  clampRatio,
  drawsMeniscus,
  fillExtent,
  type GaugeAxis,
  LINE_THICKNESS,
  linePosition,
  markerInset,
} from "@/design-system/atoms/gauge-geometry";
import { Hatch } from "@/design-system/atoms/hatch";
import { Motion } from "@/design-system/tokens";

export type GaugeSurfaceProps = {
  /** 0..1, clamped. The fill extent along the axis. */
  ratio: number;
  axis: GaugeAxis;
  /** The domain fill, chosen by the caller. */
  fillColor: string;
  /** The 2 px meniscus. Omitted → no boundary line (a bar in a cluster). */
  lineColor?: string;
  /** A second 2 px marker, independent of the fill (a setpoint). */
  markerRatio?: number;
  /** Omitted → the marker is not drawn but keeps its position, so it reappears in place. */
  markerColor?: string;
  /** Replaces the fill with the diagonal hatch: offline, or an empty slot. */
  hatched?: boolean;
  radius: number;
  outline?: { color: string; style?: "solid" | "dashed"; width?: number };
  /** Milliseconds; one of `Motion`. */
  duration?: number;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
};

export function GaugeSurface({
  ratio,
  axis,
  fillColor,
  lineColor,
  markerRatio,
  markerColor,
  hatched = false,
  radius,
  outline,
  duration = Motion.fill,
  style,
  children,
}: GaugeSurfaceProps) {
  const fill = useAnimatedRatio(clampRatio(ratio), duration);
  const marker = useAnimatedRatio(clampRatio(markerRatio ?? 0), Motion.marker);

  const fillStyle = useAnimatedStyle(() => fillExtent(fill.value, axis));
  const meniscusStyle = useAnimatedStyle(() => linePosition(fill.value, axis));
  const markerStyle = useAnimatedStyle(() => ({
    ...linePosition(marker.value, axis),
    ...markerInset(marker.value, axis),
  }));

  const vertical = axis === "vertical";
  const lineStyle = vertical ? styles.verticalLine : styles.horizontalLine;
  const showsMarker =
    markerRatio !== undefined && markerColor !== undefined && !hatched;

  return (
    <View
      testID="gauge-surface"
      style={[styles.surface, style, { borderRadius: radius }]}
    >
      {hatched ? (
        <Hatch testID="gauge-hatch" style={StyleSheet.absoluteFill} />
      ) : (
        <Animated.View
          testID="gauge-fill"
          style={[
            vertical ? styles.verticalFill : styles.horizontalFill,
            { backgroundColor: fillColor },
            fillStyle,
          ]}
        />
      )}
      {!hatched && drawsMeniscus(ratio, lineColor) && (
        <Animated.View
          testID="gauge-meniscus"
          style={[lineStyle, { backgroundColor: lineColor }, meniscusStyle]}
        />
      )}
      {showsMarker && (
        <Animated.View
          testID="gauge-marker"
          style={[lineStyle, { backgroundColor: markerColor }, markerStyle]}
        />
      )}
      {/* an overlay ring, not a border on the container: a border shifts the content inward by its width */}
      {outline && (
        <View
          testID="gauge-outline"
          style={[
            StyleSheet.absoluteFill,
            {
              pointerEvents: "none",
              borderRadius: radius,
              borderColor: outline.color,
              borderWidth: outline.width ?? LINE_THICKNESS,
              borderStyle: outline.style ?? "solid",
            },
          ]}
        />
      )}
      {children}
    </View>
  );
}

/** Initialised at the incoming ratio: the first paint shows the level, only later changes sweep to it. */
function useAnimatedRatio(target: number, duration: number) {
  const value = useSharedValue(target);
  const painted = useRef(target);

  useEffect(() => {
    if (painted.current === target) return;
    painted.current = target;
    value.value = withTiming(target, { duration });
  }, [target, duration, value]);

  return value;
}

const styles = StyleSheet.create({
  surface: {
    overflow: "hidden",
  },
  verticalFill: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
  },
  horizontalFill: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
  },
  verticalLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: LINE_THICKNESS,
  },
  horizontalLine: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: LINE_THICKNESS,
  },
});
