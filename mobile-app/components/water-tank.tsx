import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Path, Ellipse, Defs, LinearGradient, Stop } from 'react-native-svg';
import Animated, { 
  useSharedValue, 
  useAnimatedProps, 
  withTiming, 
  Easing,
} from 'react-native-reanimated';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

// Create Animated components for SVG elements
const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedEllipse = Animated.createAnimatedComponent(Ellipse);

// Configuration for the visual style
const CONFIG = {
  tankColor: '#1A2F33', // Dark greenish-grey background inside tank
  waterColor: '#06b6d4', // Cyan color matching image
  borderColor: '#22d3ee', // Lighter cyan for rim/glass
  width: 160,
  height: 240,
  ellipseHeight: 40, // How "deep" the 3D effect looks
};

export const WaterTank = ({ percentage = 80, capacity = 150 }) => {
  // Shared value for animation (0 to 1)
  const progress = useSharedValue(percentage / 100);

  useEffect(() => {
    progress.value = withTiming(percentage / 100, {
      duration: 1000,
      easing: Easing.out(Easing.exp),
    });
  }, [percentage, progress]);

  // Calculate current volume dynamically
  const displayVolume = Math.round((percentage / 100) * capacity);

  // SVG Geometry Constants
  const { width, height, ellipseHeight } = CONFIG;
  const rx = width / 2;
  const ry = ellipseHeight / 2;
  const bottomY = height - ry;
  const topY = ry;
  const cylinderHeight = bottomY - topY;

  // 1. Animated Props for the Water Surface (The top ellipse of the liquid)
  const waterSurfaceProps = useAnimatedProps(() => {
    // Calculate the Y position based on percentage (inverted because SVG Y grows downwards)
    // 0% = bottomY, 100% = topY
    const currentY = bottomY - (progress.value * cylinderHeight);
    return {
      cy: currentY,
    };
  });

  // 2. Animated Props for the Water Body (The main fill)
  const waterBodyProps = useAnimatedProps(() => {
    const currentY = bottomY - (progress.value * cylinderHeight);

    // Draw path:
    // Move to top-left of water level -> Arc to top-right -> Line down to bottom-right
    // -> Arc to bottom-left -> Line up to start
    const d = `
      M 0 ${currentY}
      A ${rx} ${ry} 0 0 1 ${width} ${currentY}
      L ${width} ${bottomY}
      A ${rx} ${ry} 0 0 1 0 ${bottomY}
      Z
    `;
    return { d };
  });

  return (
    <ThemedView style={styles.card}>
      {/* Title Header */}
      <ThemedText style={styles.title}>
        EAU PROPRE{'\n'}
        <ThemedText style={styles.subtitle}>({capacity}L)</ThemedText>
      </ThemedText>

      {/* Tank Container */}
      <ThemedView style={[styles.tankContainer, { backgroundColor: 'transparent' }]}>
        <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
          <Defs>
            <LinearGradient id="waterGradient" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor="#06b6d4" stopOpacity="0.9" />
              <Stop offset="0.5" stopColor="#22d3ee" stopOpacity="0.8" />
              <Stop offset="1" stopColor="#06b6d4" stopOpacity="0.9" />
            </LinearGradient>
          </Defs>

          {/* --- BACKGROUND TANK --- */}
          {/* Main body background */}
          <Path
            d={`M 0 ${topY} A ${rx} ${ry} 0 0 1 ${width} ${topY} L ${width} ${bottomY} A ${rx} ${ry} 0 0 1 0 ${bottomY} Z`}
            fill="rgba(6, 182, 212, 0.1)" // Very faint teal tint
            stroke={CONFIG.borderColor}
            strokeWidth="2"
            strokeOpacity="0.3"
          />
          {/* Top Rim of the glass */}
          <Ellipse
            cx={width / 2}
            cy={topY}
            rx={rx}
            ry={ry}
            fill="none"
            stroke={CONFIG.borderColor}
            strokeWidth="2"
          />

          {/* --- LIQUID --- */}
          {/* The main body of water */}
          <AnimatedPath
            animatedProps={waterBodyProps}
            fill="url(#waterGradient)"
          />
          {/* The top surface of the water (gives the 3D look) */}
          <AnimatedEllipse
            cx={width / 2}
            rx={rx}
            ry={ry}
            animatedProps={waterSurfaceProps}
            fill="#67e8f9" // Slightly lighter cyan for the top surface reflection
            fillOpacity="0.6"
          />

        </Svg>

        {/* Text Overlay (Absolute positioned to sit on top of SVG) */}
        <ThemedView style={[styles.overlayContainer, { backgroundColor: 'transparent' }]}>
          <ThemedText style={styles.volumeText}>{displayVolume}L</ThemedText>
          <ThemedText style={styles.percentageText}>{Math.round(percentage)}%</ThemedText>
        </ThemedView>
      </ThemedView>
    </ThemedView>
  );
};
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000', // Black background like image
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: '#1C1C1E', // Dark card background
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    width: '48%', // Ensure they fit side-by-side
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  title: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 14,
    color: '#AAA',
  },
  tankContainer: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  volumeText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: {width: -1, height: 1},
    textShadowRadius: 10
  },
  percentageText: {
    fontSize: 18,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  controls: {
    marginTop: 40,
    alignItems: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
  }
});