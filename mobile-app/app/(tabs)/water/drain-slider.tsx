import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useEffect, useState } from "react"; // Ajout de useEffect
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
import { IconSymbol } from "@/design-system";

const HANDLE_SIZE = 54;
const AUTO_CLOSE_TIME = 30; // Temps en secondes avant fermeture auto
const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

export function DrainSlider({
  onDrain,
  onStopDrain,
}: {
  onDrain: () => void;
  onStopDrain: () => void;
}) {
  const [isDraining, setIsDraining] = useState(false);
  const [timeLeft, setTimeLeft] = useState(AUTO_CLOSE_TIME);
  const [containerWidth, setContainerWidth] = useState(0);

  const translateX = useSharedValue(0);
  const contextX = useSharedValue(0);

  const handleStop = useCallback(() => {
    setIsDraining(false);
    setTimeLeft(AUTO_CLOSE_TIME);
    translateX.value = withSpring(0);
    onStopDrain();
  }, [onStopDrain, translateX]);

  // Gestion du compte à rebours
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    if (isDraining && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isDraining) {
      handleStop(); // Fermeture automatique
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [handleStop, isDraining, timeLeft]);

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
        runOnJS(setIsDraining)(true);
        runOnJS(onDrain)();
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

  const styles = getStyles();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <IconSymbol name="warning" size={24} color="#FFF" />
        <Text style={styles.headerText}>ZONE DE VIDANGE</Text>
      </View>

      <View style={styles.body}>
        {!isDraining ? (
          <Animated.View
            entering={FadeIn}
            exiting={FadeOut}
            style={styles.fullWidthCenter}
          >
            <Text style={styles.instruction}>
              GLISSER POUR VIDANGER {">>>"}
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
                  <IconSymbol name="delete" size={28} color="#1C1C1E" />
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
            {/* Nouveau texte de signalement */}
            <Text style={[styles.instruction, { color: "#FF5E3A" }]}>
              Fermeture automatique dans{" "}
              <Text style={{ fontWeight: "900" }}>{timeLeft}s</Text>
            </Text>

            <Pressable
              style={({ pressed }) => [
                styles.stopButton,
                pressed && { opacity: 0.8 },
              ]}
              onPress={handleStop}
            >
              <IconSymbol name="stop-circle" size={24} color="#FFF" />
              <Text style={styles.stopButtonText}>FERMER IMMÉDIATEMENT</Text>
            </Pressable>
          </Animated.View>
        )}

        <View style={styles.statusContainer}>
          <Text style={styles.statusText}>
            État vanne :{" "}
            <Text style={styles.statusBold}>
              {isDraining ? "OUVERTE" : "FERMÉE"}
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

const getStyles = () =>
  StyleSheet.create({
    container: {
      backgroundColor: "#1C1C1E",
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
      color: "#FFF",
      textAlign: "center",
      fontSize: 14,
      marginBottom: 15,
      fontWeight: "600",
      letterSpacing: 0.5,
    },
    sliderTrack: {
      height: 62,
      width: "100%",
      backgroundColor: "#000",
      borderRadius: 31,
      padding: 4,
      justifyContent: "center",
    },
    trackBackground: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "#000",
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
      backgroundColor: "#F2F2F7",
      borderRadius: HANDLE_SIZE / 2,
      justifyContent: "center",
      alignItems: "center",
      zIndex: 10,
    },
    stopButton: {
      backgroundColor: "#3A4A5E",
      height: 62,
      borderRadius: 31,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      width: "100%",
    },
    stopButtonText: {
      color: "#FFF",
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
      color: "#FFF",
      fontSize: 17,
    },
    statusBold: {
      fontWeight: "bold",
      textTransform: "uppercase",
    },
  });
