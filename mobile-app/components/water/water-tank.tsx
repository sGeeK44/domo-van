import React, { useEffect, useMemo, useState } from "react";
import { LayoutChangeEvent, StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import Svg, {
  Defs,
  Ellipse,
  LinearGradient,
  Path,
  Stop,
} from "react-native-svg";
import { Card, Colors, FontSize, FontWeight } from "@/design-system";
import { useThemeColor } from "@/hooks/use-theme-color";

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedEllipse = Animated.createAnimatedComponent(Ellipse);

export type WaterTankProps = {
  name: string;
  percentage: number;
  capacity: number;
  color: string;
};

export const WaterTank = ({
  name,
  percentage,
  capacity,
  color,
}: WaterTankProps) => {
  const colors = useThemeColor();
  const styles = getStyles(colors);
  const [layout, setLayout] = useState({ width: 0, height: 0 });
  const progress = useSharedValue(percentage / 100);

  const gradientId = useMemo(() => {
    // SVG ids must not contain '#', spaces, etc.
    const safe = name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_");
    return `grad_${safe}`;
  }, [name]);

  useEffect(() => {
    progress.value = withTiming(percentage / 100, {
      duration: 1000,
      easing: Easing.out(Easing.exp),
    });
  }, [percentage, progress]);

  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setLayout({ width, height });
  };

  const width = layout.width;
  const height = layout.height;
  const ellipseHeight = width * 0.2;
  const rx = width / 2;
  const ry = ellipseHeight / 2;
  const bottomY = height - ry;
  const topY = ry;
  const cylinderHeight = bottomY - topY;

  const waterSurfaceProps = useAnimatedProps(
    () => {
      const currentY = bottomY - progress.value * cylinderHeight;
      return { cy: currentY };
    },
    // Ensure Reanimated re-builds the worklet when layout changes.
    [bottomY, cylinderHeight],
  );

  const waterBodyProps = useAnimatedProps(
    () => {
      const currentY = bottomY - progress.value * cylinderHeight;
      const d = `
        M 0 ${currentY}
        A ${rx} ${ry} 0 0 1 ${width} ${currentY}
        L ${width} ${bottomY}
        A ${rx} ${ry} 0 0 1 0 ${bottomY}
        Z
      `;
      return { d };
    },
    // Ensure Reanimated re-builds the worklet when layout changes.
    [bottomY, cylinderHeight, rx, ry, width],
  );

  const displayVolume = Math.round((percentage / 100) * capacity);

  return (
    <Card title={name} subtitle={`(${capacity}L)`}>
      <View style={styles.tankContainer} onLayout={onLayout}>
        {width > 0 && height > 0 && (
          <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
            <Defs>
              <LinearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0" stopColor={color} stopOpacity="1" />
                <Stop offset="0.5" stopColor={color} stopOpacity="0.7" />
                <Stop offset="1" stopColor={color} stopOpacity="1" />
              </LinearGradient>
            </Defs>

            {/* Structure du réservoir (Effet Verre) */}
            <Path
              d={`M 0 ${topY} A ${rx} ${ry} 0 0 1 ${width} ${topY} L ${width} ${bottomY} A ${rx} ${ry} 0 0 1 0 ${bottomY} Z`}
              fill={color}
              fillOpacity="0.05"
              stroke={color}
              strokeWidth="1.5"
              strokeOpacity="0.2"
            />

            <Ellipse
              cx={rx}
              cy={topY}
              rx={rx}
              ry={ry}
              fill="none"
              stroke={color}
              strokeWidth="1.5"
              strokeOpacity="0.4"
            />

            {/* Liquide Dynamique */}
            <AnimatedPath
              animatedProps={waterBodyProps}
              fill={`url(#${gradientId})`}
            />

            {/* Surface du liquide (plus claire pour l'effet 3D) */}
            <AnimatedEllipse
              cx={rx}
              rx={rx}
              ry={ry}
              animatedProps={waterSurfaceProps}
              fill={color}
              fillOpacity="0.6"
            />
          </Svg>
        )}

        <View style={styles.overlayContainer} pointerEvents="none">
          <Text style={styles.volumeText}>{displayVolume}L</Text>
          <Text style={styles.percentageText}>{Math.round(percentage)}%</Text>
        </View>
      </View>
    </Card>
  );
};

const getStyles = (colors: typeof Colors.light | typeof Colors.dark) =>
  StyleSheet.create({
    tankContainer: {
      flex: 1,
      width: "100%",
      minHeight: 180,
      position: "relative",
      justifyContent: "center",
      alignItems: "center",
    },
    overlayContainer: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      justifyContent: "center",
      alignItems: "center",
      zIndex: 10,
    },
    volumeText: {
      fontSize: FontSize.xl,
      fontWeight: FontWeight.bold,
      color: colors.info["500"],
      textShadowColor: "rgba(0, 0, 0, 0.5)",
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 4,
    },
    percentageText: {
      fontSize: FontSize.xs,
      color: colors.info["500"],
      opacity: 0.8,
    },
  });
