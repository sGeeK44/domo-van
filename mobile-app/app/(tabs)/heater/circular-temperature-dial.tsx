import { Colors, FontSize, FontWeight } from "@/design-system";
import type { HeaterZoneSnapshot } from "@/domain/heater/HeaterZone";
import { useThemeColor } from "@/hooks/use-theme-color";
import * as Haptics from "expo-haptics";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import Svg, {
  Circle,
  Defs,
  G,
  Path,
  RadialGradient,
  Stop,
} from "react-native-svg";
import {
  MAX_TEMP,
  MIN_TEMP,
  TEMP_STEP,
  getTemperatureColor,
  getTemperatureColorDimmed,
} from "./temperature-colors";

const AnimatedPath = Animated.createAnimatedComponent(Path);

// Arc configuration
const ARC_START_ANGLE = 135; // Bottom-left (degrees)
const ARC_END_ANGLE = 45; // Bottom-right (degrees)
const ARC_SWEEP = 270; // Total arc sweep in degrees
const STROKE_WIDTH = 6;
const TOUCH_ZONE_WIDTH = 40; // Wide touch area for van ergonomics

export type CircularTemperatureDialProps = {
  name: string;
  zoneState: HeaterZoneSnapshot;
  onSetpointChange: (newSetpoint: number) => void;
  onToggle: () => void;
};

/**
 * Convert temperature to angle (in degrees, 0 = right, counterclockwise)
 */
function tempToAngle(temp: number): number {
  "worklet";
  const clampedTemp = Math.max(MIN_TEMP, Math.min(MAX_TEMP, temp));
  const ratio = (clampedTemp - MIN_TEMP) / (MAX_TEMP - MIN_TEMP);
  return ARC_START_ANGLE + ratio * ARC_SWEEP;
}

/**
 * Convert angle to temperature
 */
function angleToTemp(angle: number): number {
  "worklet";
  // Normalize angle to 0-360 range
  let normalizedAngle = angle % 360;
  if (normalizedAngle < 0) normalizedAngle += 360;

  // Map from arc range to temperature
  let relativeAngle = normalizedAngle - ARC_START_ANGLE;
  if (relativeAngle < 0) relativeAngle += 360;

  const ratio = Math.max(0, Math.min(1, relativeAngle / ARC_SWEEP));
  const temp = MIN_TEMP + ratio * (MAX_TEMP - MIN_TEMP);

  // Snap to step
  return Math.round(temp / TEMP_STEP) * TEMP_STEP;
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

export function CircularTemperatureDial({
  name,
  zoneState,
  onSetpointChange,
  onToggle,
}: CircularTemperatureDialProps) {
  const colors = useThemeColor();
  const styles = getStyles(colors);

  const { temperatureCelsius, setpointCelsius, isRunning } = zoneState;

  // Layout state
  const [layout, setLayout] = useState({ width: 0, height: 0 });

  // Precision mode state
  const [precisionMode, setPrecisionMode] = useState(false);
  const precisionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  // Animated value for arc
  const animatedSetpoint = useSharedValue(setpointCelsius);

  // Update animated value when setpoint changes externally
  useEffect(() => {
    animatedSetpoint.value = withTiming(setpointCelsius, {
      duration: 200,
      easing: Easing.out(Easing.quad),
    });
  }, [setpointCelsius, animatedSetpoint]);

  // Calculated dimensions
  const size = Math.min(layout.width, layout.height);
  const cx = size / 2;
  const cy = size / 2;
  const radius = (size - STROKE_WIDTH * 2 - 20) / 2;

  // Color based on setpoint
  const arcColor = getTemperatureColor(setpointCelsius, isRunning);
  const bgArcColor = getTemperatureColorDimmed(setpointCelsius, isRunning);

  // Haptic feedback helper
  const triggerHaptic = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  // Handle setpoint change with haptic
  const lastHapticTemp = useRef(setpointCelsius);
  const handleSetpointUpdate = useCallback(
    (newTemp: number) => {
      // Trigger haptic on 0.5°C changes
      if (Math.abs(newTemp - lastHapticTemp.current) >= TEMP_STEP) {
        triggerHaptic();
        lastHapticTemp.current = newTemp;
      }
      onSetpointChange(newTemp);
    },
    [onSetpointChange, triggerHaptic],
  );

  // Pan gesture for circular drag
  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      if (!isRunning) return;

      // Calculate angle from center
      const dx = event.x - cx;
      const dy = event.y - cy;
      let angle = (Math.atan2(dy, dx) * 180) / Math.PI;

      // Convert to our coordinate system (0 = right, positive = clockwise)
      const newTemp = angleToTemp(angle);
      animatedSetpoint.value = newTemp;
      runOnJS(handleSetpointUpdate)(newTemp);
    })
    .minDistance(5);

  // Background arc path (full arc)
  const bgArcPath =
    radius > 0
      ? describeArc(
          cx,
          cy,
          radius,
          ARC_START_ANGLE,
          ARC_START_ANGLE + ARC_SWEEP,
        )
      : "";

  // Animated props for the filled arc
  const animatedArcProps = useAnimatedProps(() => {
    const currentAngle = tempToAngle(animatedSetpoint.value);
    const path = describeArc(cx, cy, radius, ARC_START_ANGLE, currentAngle);
    return { d: path };
  }, [cx, cy, radius]);

  // Handle layout
  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setLayout({ width, height });
  };

  // Precision mode handlers
  const showPrecisionControls = () => {
    if (!isRunning) return;

    setPrecisionMode(true);
    // Reset timeout
    if (precisionTimeoutRef.current) {
      clearTimeout(precisionTimeoutRef.current);
    }
    precisionTimeoutRef.current = setTimeout(() => {
      setPrecisionMode(false);
    }, 3000);
  };

  const handlePrecisionIncrement = () => {
    const newSetpoint = Math.min(MAX_TEMP, setpointCelsius + TEMP_STEP);
    onSetpointChange(newSetpoint);
    triggerHaptic();
    showPrecisionControls(); // Reset timeout
  };

  const handlePrecisionDecrement = () => {
    const newSetpoint = Math.max(MIN_TEMP, setpointCelsius - TEMP_STEP);
    onSetpointChange(newSetpoint);
    triggerHaptic();
    showPrecisionControls(); // Reset timeout
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (precisionTimeoutRef.current) {
        clearTimeout(precisionTimeoutRef.current);
      }
    };
  }, []);

  // Cursor position on the arc
  const cursorAngle = tempToAngle(setpointCelsius);
  const cursorPos = polarToCartesian(cx, cy, radius, cursorAngle);

  return (
    <View style={styles.container}>
      {/* Zone Name */}
      <Text style={styles.zoneName}>{name.toUpperCase()}</Text>

      {/* Dial Container */}
      <View style={styles.dialContainer} onLayout={onLayout}>
        {size > 0 && (
          <GestureDetector gesture={panGesture}>
            <Animated.View style={styles.svgContainer}>
              <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                <Defs>
                  {/* Gradient for inner circle depth effect */}
                  <RadialGradient
                    id="innerCircleGradient"
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

                {/* Halo/glow effect - multiple layers for diffuse light (follows filled arc only) */}
                {isRunning && (
                  <G>
                    {/* Outermost glow layer - very faint */}
                    <AnimatedPath
                      animatedProps={animatedArcProps}
                      stroke={arcColor}
                      strokeWidth={STROKE_WIDTH + 28}
                      strokeLinecap="round"
                      fill="none"
                      opacity={0.04}
                    />
                    {/* Outer glow layer */}
                    <AnimatedPath
                      animatedProps={animatedArcProps}
                      stroke={arcColor}
                      strokeWidth={STROKE_WIDTH + 20}
                      strokeLinecap="round"
                      fill="none"
                      opacity={0.06}
                    />
                    {/* Middle glow layer */}
                    <AnimatedPath
                      animatedProps={animatedArcProps}
                      stroke={arcColor}
                      strokeWidth={STROKE_WIDTH + 14}
                      strokeLinecap="round"
                      fill="none"
                      opacity={0.1}
                    />
                    {/* Inner glow layer - brightest */}
                    <AnimatedPath
                      animatedProps={animatedArcProps}
                      stroke={arcColor}
                      strokeWidth={STROKE_WIDTH + 8}
                      strokeLinecap="round"
                      fill="none"
                      opacity={0.15}
                    />
                  </G>
                )}

                {/* Inner dark circle */}
                <Circle
                  cx={cx}
                  cy={cy}
                  r={radius - STROKE_WIDTH - 2}
                  fill="url(#innerCircleGradient)"
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

                {/* Cursor/thumb on the arc */}
                {isRunning && (
                  <Circle
                    cx={cursorPos.x}
                    cy={cursorPos.y}
                    r={STROKE_WIDTH / 2 + 3}
                    fill={arcColor}
                  />
                )}
              </Svg>

              {/* Center content */}
              <Pressable
                style={styles.centerContent}
                onPress={showPrecisionControls}
              >
                {/* Current Temperature */}
                <Text
                  style={[
                    styles.currentTemp,
                    { color: isRunning ? "#FFFFFF" : "#666666" },
                  ]}
                >
                  {temperatureCelsius.toFixed(1)}
                  <Text style={styles.tempUnit}>°C</Text>
                </Text>

                {/* Target Temperature */}
                {isRunning ? (
                  <Text style={styles.targetTemp}>
                    Cible: {setpointCelsius.toFixed(1)}°C
                  </Text>
                ) : (
                  <Text style={styles.targetTemp}>---</Text>
                )}

                {/* Precision Controls */}
                {precisionMode && isRunning && (
                  <View style={styles.precisionControls}>
                    <Pressable
                      style={styles.precisionButton}
                      onPress={handlePrecisionDecrement}
                      hitSlop={12}
                    >
                      <Text style={styles.precisionButtonText}>−</Text>
                    </Pressable>
                    <Pressable
                      style={styles.precisionButton}
                      onPress={handlePrecisionIncrement}
                      hitSlop={12}
                    >
                      <Text style={styles.precisionButtonText}>+</Text>
                    </Pressable>
                  </View>
                )}
              </Pressable>
            </Animated.View>
          </GestureDetector>
        )}
      </View>

      {/* Toggle Button */}
      <Pressable
        onPress={onToggle}
        style={({ pressed }) => [
          styles.toggleButton,
          isRunning ? styles.toggleButtonOn : styles.toggleButtonOff,
          pressed && { opacity: 0.8 },
        ]}
      >
        <Text
          style={[
            styles.toggleButtonText,
            { color: isRunning ? "#FFFFFF" : "#888888" },
          ]}
        >
          {isRunning ? "ON" : "OFF"}
        </Text>
      </Pressable>
    </View>
  );
}

const getStyles = (colors: typeof Colors.light | typeof Colors.dark) =>
  StyleSheet.create({
    container: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 4,
    },
    zoneName: {
      fontSize: FontSize.s,
      fontWeight: FontWeight.semiBold,
      color: colors.info["500"],
      letterSpacing: 2,
      marginBottom: 4,
    },
    dialContainer: {
      flex: 1,
      width: "100%",
      aspectRatio: 1,
      maxWidth: 200,
      maxHeight: 200,
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
    currentTemp: {
      fontSize: 36,
      fontWeight: "300",
      letterSpacing: -1,
    },
    tempUnit: {
      fontSize: 18,
      fontWeight: "300",
    },
    targetTemp: {
      fontSize: FontSize.xs,
      color: colors.neutral["500"],
      marginTop: 2,
    },
    precisionControls: {
      flexDirection: "row",
      marginTop: 8,
      gap: 24,
    },
    precisionButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: "rgba(255, 255, 255, 0.15)",
      justifyContent: "center",
      alignItems: "center",
    },
    precisionButtonText: {
      fontSize: 20,
      fontWeight: "600",
      color: "#FFFFFF",
    },
    toggleButton: {
      paddingVertical: 6,
      paddingHorizontal: 20,
      borderRadius: 16,
      marginTop: -4,
    },
    toggleButtonOn: {
      backgroundColor: "transparent",
      borderWidth: 1.5,
      borderColor: "rgba(255, 255, 255, 0.3)",
    },
    toggleButtonOff: {
      backgroundColor: "transparent",
      borderWidth: 1.5,
      borderColor: "rgba(255, 255, 255, 0.15)",
    },
    toggleButtonText: {
      fontSize: FontSize.s,
      fontWeight: FontWeight.semiBold,
      letterSpacing: 1,
    },
  });
