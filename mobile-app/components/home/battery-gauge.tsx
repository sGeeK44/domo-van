import { useEffect, useState } from "react";
import { LayoutChangeEvent, StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle, Defs, G, Path, RadialGradient, Stop } from "react-native-svg";
import { Colors, FontSize, FontWeight, IconSymbol } from "@/design-system";
import { useThemeColor } from "@/hooks/use-theme-color";

const AnimatedPath = Animated.createAnimatedComponent(Path);

// Arc configuration
const ARC_START_ANGLE = 135; // Bottom-left (degrees)
const ARC_SWEEP = 270; // Total arc sweep in degrees
const STROKE_WIDTH = 8;

export type BatteryGaugeProps = {
  percentage: number;
  remainingTime: string;
  voltage: number;
  consumption: number;
};

/**
 * Get battery color based on percentage
 */
function getBatteryColor(percentage: number): string {
  if (percentage > 50) return "#22C55E"; // Green
  if (percentage > 20) return "#F97316"; // Orange
  return "#EF4444"; // Red
}

/**
 * Get dimmed battery color for background arc
 */
function getBatteryColorDimmed(percentage: number): string {
  if (percentage > 50) return "rgba(34, 197, 94, 0.2)";
  if (percentage > 20) return "rgba(249, 115, 22, 0.2)";
  return "rgba(239, 68, 68, 0.2)";
}

/**
 * Convert percentage to angle (in degrees)
 */
function percentToAngle(percent: number): number {
  "worklet";
  const clampedPercent = Math.max(0, Math.min(100, percent));
  const ratio = clampedPercent / 100;
  return ARC_START_ANGLE + ratio * ARC_SWEEP;
}

/**
 * Convert polar coordinates to cartesian
 */
function polarToCartesian(
  cx: number,
  cy: number,
  radius: number,
  angleDegrees: number,
): { x: number; y: number } {
  "worklet";
  const angleRadians = (angleDegrees * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(angleRadians),
    y: cy + radius * Math.sin(angleRadians),
  };
}

/**
 * Create SVG arc path
 */
function describeArc(
  cx: number,
  cy: number,
  radius: number,
  startAngle: number,
  endAngle: number,
): string {
  "worklet";
  const start = polarToCartesian(cx, cy, radius, startAngle);
  const end = polarToCartesian(cx, cy, radius, endAngle);

  let sweep = endAngle - startAngle;
  if (sweep < 0) sweep += 360;

  const largeArcFlag = sweep > 180 ? 1 : 0;

  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`;
}

export function BatteryGauge({
  percentage,
  remainingTime,
  voltage,
  consumption,
}: BatteryGaugeProps) {
  const colors = useThemeColor();
  const styles = getStyles(colors);

  // Layout state
  const [layout, setLayout] = useState({ width: 0, height: 0 });

  // Animated value for arc
  const animatedPercent = useSharedValue(percentage);

  // Update animated value when percentage changes
  useEffect(() => {
    animatedPercent.value = withTiming(percentage, {
      duration: 800,
      easing: Easing.out(Easing.quad),
    });
  }, [percentage, animatedPercent]);

  // Calculated dimensions
  const size = Math.min(layout.width, layout.height);
  const cx = size / 2;
  const cy = size / 2;
  const radius = (size - STROKE_WIDTH * 2 - 30) / 2;

  // Color based on percentage
  const arcColor = getBatteryColor(percentage);
  const bgArcColor = getBatteryColorDimmed(percentage);

  // Background arc path (full arc)
  const bgArcPath =
    radius > 0
      ? describeArc(cx, cy, radius, ARC_START_ANGLE, ARC_START_ANGLE + ARC_SWEEP)
      : "";

  // Animated props for the filled arc
  const animatedArcProps = useAnimatedProps(() => {
    const currentAngle = percentToAngle(animatedPercent.value);
    const path = describeArc(cx, cy, radius, ARC_START_ANGLE, currentAngle);
    return { d: path };
  }, [cx, cy, radius]);

  // Handle layout
  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setLayout({ width, height });
  };

  // Format consumption with sign
  const consumptionText =
    consumption >= 0 ? `+${consumption}W` : `${consumption}W`;

  return (
    <View style={styles.container}>
      {/* Gauge Container */}
      <View style={styles.gaugeContainer} onLayout={onLayout}>
        {size > 0 && (
          <Animated.View style={styles.svgContainer}>
            <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
              <Defs>
                {/* Gradient for inner circle depth effect */}
                <RadialGradient
                  id="batteryInnerGradient"
                  cx="50%"
                  cy="50%"
                  rx="50%"
                  ry="50%"
                >
                  <Stop offset="0%" stopColor="#1a1a1a" stopOpacity="1" />
                  <Stop offset="85%" stopColor="#0d0d0d" stopOpacity="1" />
                  <Stop offset="100%" stopColor="#000000" stopOpacity="1" />
                </RadialGradient>
              </Defs>

              {/* Halo/glow effect */}
              <G>
                <AnimatedPath
                  animatedProps={animatedArcProps}
                  stroke={arcColor}
                  strokeWidth={STROKE_WIDTH + 24}
                  strokeLinecap="round"
                  fill="none"
                  opacity={0.05}
                />
                <AnimatedPath
                  animatedProps={animatedArcProps}
                  stroke={arcColor}
                  strokeWidth={STROKE_WIDTH + 16}
                  strokeLinecap="round"
                  fill="none"
                  opacity={0.08}
                />
                <AnimatedPath
                  animatedProps={animatedArcProps}
                  stroke={arcColor}
                  strokeWidth={STROKE_WIDTH + 10}
                  strokeLinecap="round"
                  fill="none"
                  opacity={0.12}
                />
              </G>

              {/* Inner dark circle */}
              <Circle
                cx={cx}
                cy={cy}
                r={radius - STROKE_WIDTH - 4}
                fill="url(#batteryInnerGradient)"
              />

              {/* Background arc (full) */}
              <Path
                d={bgArcPath}
                stroke={bgArcColor}
                strokeWidth={STROKE_WIDTH}
                strokeLinecap="round"
                fill="none"
              />

              {/* Filled arc (animated) */}
              <AnimatedPath
                animatedProps={animatedArcProps}
                stroke={arcColor}
                strokeWidth={STROKE_WIDTH}
                strokeLinecap="round"
                fill="none"
              />
            </Svg>

            {/* Center content */}
            <View style={styles.centerContent}>
              <Text style={[styles.percentageText, { color: arcColor }]}>
                {Math.round(percentage)}%
              </Text>
              <Text style={styles.remainingText}>{remainingTime}</Text>
            </View>
          </Animated.View>
        )}
      </View>

      {/* Bottom indicators */}
      <View style={styles.indicatorsRow}>
        <View style={styles.indicator}>
          <IconSymbol name="battery-charging-full" size={18} color={colors.neutral["500"]} />
          <Text style={styles.indicatorValue}>{voltage.toFixed(1)}V</Text>
        </View>
        <View style={styles.indicator}>
          <IconSymbol name="bolt" size={18} color={colors.neutral["500"]} />
          <Text style={styles.indicatorLabel}>Conso:</Text>
          <Text style={styles.indicatorValue}>{consumptionText}</Text>
        </View>
      </View>
    </View>
  );
}

const getStyles = (colors: typeof Colors.light | typeof Colors.dark) =>
  StyleSheet.create({
    container: {
      alignItems: "center",
    },
    gaugeContainer: {
      width: "100%",
      aspectRatio: 1,
      maxWidth: 220,
      maxHeight: 220,
    },
    svgContainer: {
      flex: 1,
      position: "relative",
    },
    centerContent: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      justifyContent: "center",
      alignItems: "center",
    },
    percentageText: {
      fontSize: 48,
      fontWeight: "700",
      letterSpacing: -2,
    },
    remainingText: {
      fontSize: FontSize.s,
      color: colors.neutral["500"],
      marginTop: 2,
    },
    indicatorsRow: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      gap: 24,
      marginTop: -10,
    },
    indicator: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    indicatorLabel: {
      fontSize: FontSize.xs,
      color: colors.neutral["500"],
    },
    indicatorValue: {
      fontSize: FontSize.s,
      color: colors.info["500"],
      fontWeight: FontWeight.medium,
    },
  });
