import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Extrapolation,
  FadeIn,
  FadeOut,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { IconSymbol, type Palette, useThemeColor } from "@/design-system";

const HANDLE_SIZE = 54;
const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

export function DrainSlider({
  isDraining,
  remainingSeconds,
  onDrain,
  onStopDrain,
}: {
  isDraining: boolean;
  remainingSeconds: number;
  onDrain: () => void;
  onStopDrain: () => void;
}) {
  const { t } = useTranslation();
  const [containerWidth, setContainerWidth] = useState(0);

  const translateX = useSharedValue(0);
  const contextX = useSharedValue(0);

  const handleStop = useCallback(() => {
    translateX.value = withSpring(0);
    onStopDrain();
  }, [onStopDrain, translateX]);

  const handleDrainStart = useCallback(() => {
    onDrain();
  }, [onDrain]);

  // Reading or writing a shared value during render desyncs Reanimated from the Fabric commit.
  useEffect(() => {
    if (isDraining) return;
    translateX.value = withSpring(0);
  }, [isDraining, translateX]);

  const colors = useThemeColor();
  const maxTranslate = containerWidth - HANDLE_SIZE - 8;

  const onLayout = (event: LayoutChangeEvent) => {
    setContainerWidth(event.nativeEvent.layout.width);
  };

  const panGesture = Gesture.Pan()
    .onStart(() => {
      contextX.value = translateX.value;
    })
    .onUpdate((event) => {
      translateX.value = Math.min(
        Math.max(0, contextX.value + event.translationX),
        maxTranslate,
      );
    })
    .onEnd(() => {
      if (translateX.value > maxTranslate * 0.8) {
        translateX.value = withSpring(maxTranslate);
        runOnJS(handleDrainStart)();
      } else {
        translateX.value = withSpring(0);
      }
    });

  const animatedHandleStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const animatedProgressStyle = useAnimatedStyle(() => {
    const width = interpolate(
      translateX.value,
      [0, maxTranslate],
      [HANDLE_SIZE, containerWidth - 8],
      Extrapolation.CLAMP,
    );
    return { width };
  });

  const styles = getStyles(colors);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <IconSymbol name="warning" size={24} color="#FFF" />
        <Text style={styles.headerText}>{t("water.drain.zone")}</Text>
      </View>

      <View style={styles.body}>
        {!isDraining ? (
          <Animated.View
            entering={FadeIn}
            exiting={FadeOut}
            style={styles.fullWidthCenter}
          >
            <Text style={styles.instruction}>
              {t("water.drain.slide")} {">>>"}
            </Text>

            <View style={styles.sliderTrack} onLayout={onLayout}>
              <View style={styles.trackBackground} />
              <AnimatedLinearGradient
                colors={["#a1624a", "#ff5e3a", "#ff2a00"]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={[styles.progressBar, animatedProgressStyle]}
              />
              <GestureDetector gesture={panGesture}>
                <Animated.View style={[styles.handle, animatedHandleStyle]}>
                  <IconSymbol
                    name="delete"
                    size={28}
                    color={colors.onInverse}
                  />
                </Animated.View>
              </GestureDetector>
            </View>
          </Animated.View>
        ) : (
          <Animated.View
            entering={FadeIn}
            exiting={FadeOut}
            style={styles.fullWidthCenter}
          >
            <Text style={[styles.instruction, { color: "#FF5E3A" }]}>
              {t("water.drain.autoClose")}{" "}
              <Text style={{ fontWeight: "900" }}>{remainingSeconds}s</Text>
            </Text>

            <Pressable
              style={({ pressed }) => [
                styles.stopButton,
                pressed && { opacity: 0.8 },
              ]}
              onPress={handleStop}
            >
              <IconSymbol
                name="stop-circle"
                size={24}
                color={colors.onInverse}
              />
              <Text style={styles.stopButtonText}>
                {t("water.drain.closeNow")}
              </Text>
            </Pressable>
          </Animated.View>
        )}

        <View style={styles.statusContainer}>
          <Text style={styles.statusText}>
            {t("water.drain.valveState")}{" "}
            <Text style={styles.statusBold}>
              {t(isDraining ? "water.drain.open" : "water.drain.closed")}
            </Text>
          </Text>
          <IconSymbol
            name={isDraining ? "lock-open" : "lock"}
            size={20}
            color="#FFD700"
            style={{ marginLeft: 8 }}
          />
        </View>
      </View>
    </View>
  );
}

const getStyles = (colors: Palette) =>
  StyleSheet.create({
    container: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: "rgba(255, 94, 58, 0.2)",
      width: "100%",
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#FF5E3A",
      paddingVertical: 12,
    },
    headerText: {
      color: "#FFF",
      fontWeight: "800",
      fontSize: 18,
      marginLeft: 10,
    },
    body: {
      padding: 20,
      alignItems: "center",
      minHeight: 160,
    },
    fullWidthCenter: {
      width: "100%",
      alignItems: "center",
    },
    instruction: {
      color: colors.text,
      textAlign: "center",
      fontSize: 14,
      marginBottom: 15,
      fontWeight: "600",
      letterSpacing: 0.5,
    },
    sliderTrack: {
      height: 62,
      width: "100%",
      backgroundColor: colors.screen,
      borderRadius: 31,
      padding: 4,
      justifyContent: "center",
    },
    trackBackground: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: colors.screen,
      borderRadius: 31,
    },
    progressBar: {
      position: "absolute",
      left: 4,
      height: 54,
      borderRadius: 27,
    },
    handle: {
      width: HANDLE_SIZE,
      height: HANDLE_SIZE,
      backgroundColor: colors.textMuted,
      borderRadius: HANDLE_SIZE / 2,
      justifyContent: "center",
      alignItems: "center",
      zIndex: 10,
    },
    stopButton: {
      backgroundColor: colors.inverse,
      height: 62,
      borderRadius: 31,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      width: "100%",
    },
    stopButtonText: {
      color: colors.onInverse,
      fontWeight: "bold",
      fontSize: 15,
      marginLeft: 10,
    },
    statusContainer: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 20,
    },
    statusText: {
      color: colors.text,
      fontSize: 17,
    },
    statusBold: {
      fontWeight: "bold",
      textTransform: "uppercase",
    },
  });
