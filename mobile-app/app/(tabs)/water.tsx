import { DrainSlider } from "@/components/water/drain-slider";
import { WaterTank } from "@/components/water/water-tank";
import { Observable } from "@/core/observable";
import { Colors } from "@/design-system";
import { PageHeader } from "@/design-system/molecules/page-header";
import { ValveState } from "@/domain/water/DrainValve";
import { WaterSystem } from "@/domain/water/WaterSystem";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useMultiModuleConnection } from "@/hooks/useMultiModuleConnection";
import { useWaterDevice } from "@/hooks/useModuleDevice";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useSyncExternalStore } from "react";
import { StatusBar, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

/** React adapter for Observable<T> */
function useObservable<T>(obs: Observable<T> | null): T | null {
  return useSyncExternalStore(
    obs?.subscribe ?? (() => () => {}),
    obs?.getValue ?? (() => null),
    obs?.getValue ?? (() => null),
  );
}

const DEFAULT_TANK_STATE = {
  capacityLiters: 0,
  heightMm: 0,
  percentage: 0,
  lastDistanceMm: null,
};

const DEFAULT_VALVE_STATE: ValveState = {
  position: "unknown",
  autoCloseSeconds: 30,
  remainingSeconds: 0,
  lastMessage: null,
};

export default function WaterScreen() {
  const colors = useThemeColor();
  const styles = getStyles(colors);
  const router = useRouter();

  const { device, isConnected } = useWaterDevice();
  const { globalStatus, connectAll, disconnectAll } = useMultiModuleConnection();

  const handleBluetoothPress = () => {
    if (globalStatus === "connected" || globalStatus === "partial") {
      void disconnectAll();
    } else {
      void connectAll();
    }
  };

  const bluetoothStatus = globalStatus === "connecting" ? "loading" : globalStatus;

  // Create WaterSystem when device is connected
  const waterSystem = useMemo(
    () => (device ? new WaterSystem(device) : null),
    [device],
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
  const valve =
    useObservable(waterSystem?.greyDrainValve ?? null) ?? DEFAULT_VALVE_STATE;

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

  // Valve state
  const isDraining = isConnected && valve.position === "open";
  const remainingSeconds = isConnected ? valve.remainingSeconds : 0;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="default" />
      <SafeAreaView style={{ flex: 1 }}>
        <PageHeader
          title="Niveaux d'Eau"
          onSettingsPress={() => router.push("/water-settings")}
          onBluetoothPress={handleBluetoothPress}
          bluetoothStatus={bluetoothStatus}
        />
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
          <DrainSlider
            isDraining={isDraining}
            remainingSeconds={remainingSeconds}
            onDrain={handleDrain}
            onStopDrain={handleStopDrain}
          />
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
    tanksRow: {
      flex: 1,
      flexDirection: "row",
      alignSelf: "stretch",
      backgroundColor: "transparent",
      gap: 10,
    },
  });
