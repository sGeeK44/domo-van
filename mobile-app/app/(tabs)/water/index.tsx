import { DrainSlider } from "@/app/(tabs)/water/drain-slider";
import { WaterTank } from "@/app/(tabs)/water/water-tank";
import { Observable } from "@/core/observable";
import { Colors } from "@/design-system";
import { IconSymbol } from "@/design-system/atoms/icon-symbol";
import { WaterSystem } from "@/domain/water/WaterSystem";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useConnectedDevice } from "@/hooks/useConnectedDevice";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useSyncExternalStore } from "react";
import { Pressable, StatusBar, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

/** React adapter for Observable<T> */
function useObservable<T>(obs: Observable<T> | null): T | null {
  return useSyncExternalStore(
    obs?.subscribe ?? (() => () => {}),
    obs?.getValue ?? (() => null),
    obs?.getValue ?? (() => null)
  );
}

const DEFAULT_TANK_STATE = {
  capacityLiters: 0,
  heightMm: 0,
  percentage: 0,
  lastDistanceMm: null,
};

export default function WaterScreen() {
  const colors = useThemeColor();
  const styles = getStyles(colors);
  const router = useRouter();

  const { device, isConnected } = useConnectedDevice();

  // Create WaterSystem when device is connected
  const waterSystem = useMemo(
    () => (device ? new WaterSystem(device) : null),
    [device]
  );

  // Cleanup WaterSystem on unmount or device change
  useEffect(() => {
    return () => {
      waterSystem?.dispose();
    };
  }, [waterSystem]);

  const clean =
    useObservable(waterSystem?.cleanTank ?? null) ?? DEFAULT_TANK_STATE;
  const grey =
    useObservable(waterSystem?.greyTank ?? null) ?? DEFAULT_TANK_STATE;

  const handleDrain = () => {
    void waterSystem?.greyDrainValve.open();
  };
  const handleStopDrain = () => {
    void waterSystem?.greyDrainValve.close();
  };

  // Show 0 when disconnected
  const cleanCapacity = isConnected ? clean.capacityLiters : 0;
  const cleanPercentage = isConnected ? clean.percentage : 0;
  const greyCapacity = isConnected ? grey.capacityLiters : 0;
  const greyPercentage = isConnected ? grey.percentage : 0;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="default" />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <Text style={styles.title}>Niveaux d{"'"}Eau</Text>
          <Pressable
            onPress={() => router.push("/water-settings")}
            style={styles.iconButton}
            hitSlop={10}
          >
            <View style={styles.iconCircle}>
              <IconSymbol name="settings" size={18} color="#FFFFFF" />
              <View
                style={[
                  styles.badge,
                  { backgroundColor: isConnected ? "#2ECC71" : "#E74C3C" },
                ]}
              />
            </View>
          </Pressable>
        </View>
        <View style={styles.content}>
          <View style={styles.tanksRow}>
            <WaterTank
              name="EAU PROPRE"
              capacity={cleanCapacity}
              percentage={cleanPercentage}
              color={colors["water"]["clean"]}
            />
            <WaterTank
              name="EAU GRISE"
              capacity={greyCapacity}
              percentage={greyPercentage}
              color={colors["water"]["grey"]}
            />
          </View>
          <DrainSlider onDrain={handleDrain} onStopDrain={handleStopDrain} />
        </View>
      </SafeAreaView>
    </View>
  );
}

const getStyles = (colors: typeof Colors.light | typeof Colors.dark) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background.primary,
    },
    content: {
      flex: 1,
      padding: 20,
      gap: 20,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 10,
    },
    iconButton: {
      borderRadius: 999,
    },
    iconCircle: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: "rgba(255, 255, 255, 0.12)",
      justifyContent: "center",
      alignItems: "center",
      position: "relative",
    },
    badge: {
      position: "absolute",
      top: 6,
      right: 6,
      width: 10,
      height: 10,
      borderRadius: 5,
      borderWidth: 2,
      borderColor: "rgba(0, 0, 0, 0.25)",
    },
    title: {
      fontSize: 38,
      fontWeight: "900",
      color: "#FFFFFF",
      letterSpacing: -1,
    },
    tanksRow: {
      flex: 1,
      flexDirection: "row",
      alignSelf: "stretch",
      backgroundColor: "transparent",
      gap: 10,
    },
    drainSlider: {
      flex: 1,
      backgroundColor: "transparent",
      alignSelf: "flex-end",
    },
  });
