import { CircularTemperatureDial } from "@/app/(tabs)/heater/circular-temperature-dial";
import { useBle } from "@/components/BleProvider";
import { Observable } from "@/core/observable";
import { Colors } from "@/design-system";
import { IconSymbol } from "@/design-system/atoms/icon-symbol";
import { HeaterSystem } from "@/domain/heater/HeaterSystem";
import { HeaterZoneSnapshot } from "@/domain/heater/HeaterZone";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useActiveModule } from "@/hooks/useActiveModule";
import { useHeaterDevice } from "@/hooks/useModuleDevice";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";
import {
    ActivityIndicator,
    Pressable,
    StatusBar,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

/** React adapter for Observable<T> */
function useObservable<T>(obs: Observable<T> | null): T | null {
  return useSyncExternalStore(
    obs?.subscribe ?? (() => () => {}),
    obs?.getValue ?? (() => null),
    obs?.getValue ?? (() => null)
  );
}

const DEFAULT_ZONE_STATE: HeaterZoneSnapshot = {
  temperatureCelsius: 0,
  setpointCelsius: 20,
  isRunning: false,
  pidConfig: null,
  lastMessage: null,
};

const ZONE_NAMES = ["Salon", "Chambre", "SdB", "Soute"];

export default function HeaterScreen() {
  const colors = useThemeColor();
  const styles = getStyles(colors);
  const router = useRouter();

  const { bluetooth } = useBle();
  const { device, isConnected, isConnecting } = useHeaterDevice();
  const { isSwitching, switchToModule } = useActiveModule();

  // Switch to heater module when screen gains focus
  useFocusEffect(
    useCallback(() => {
      void switchToModule("heater", bluetooth);
    }, [bluetooth, switchToModule])
  );

  const isLoading = isConnecting || isSwitching;

  // Create HeaterSystem when device is connected
  const heaterSystem = useMemo(
    () => (device ? new HeaterSystem(device) : null),
    [device]
  );

  // Cleanup HeaterSystem on unmount or device change
  useEffect(() => {
    return () => {
      heaterSystem?.dispose();
    };
  }, [heaterSystem]);

  // Subscribe to all 4 zones
  const zone0 =
    useObservable(heaterSystem?.zones[0] ?? null) ?? DEFAULT_ZONE_STATE;
  const zone1 =
    useObservable(heaterSystem?.zones[1] ?? null) ?? DEFAULT_ZONE_STATE;
  const zone2 =
    useObservable(heaterSystem?.zones[2] ?? null) ?? DEFAULT_ZONE_STATE;
  const zone3 =
    useObservable(heaterSystem?.zones[3] ?? null) ?? DEFAULT_ZONE_STATE;

  const zones = [zone0, zone1, zone2, zone3];

  // Handlers for setpoint changes
  const handleSetpointChange = useCallback(
    (zoneIndex: number, newSetpoint: number) => {
      heaterSystem?.zones[zoneIndex]?.setSetpoint(newSetpoint);
    },
    [heaterSystem]
  );

  // Handlers for toggle
  const handleToggle = useCallback(
    (zoneIndex: number) => {
      const zone = heaterSystem?.zones[zoneIndex];
      if (!zone) return;

      const currentState = zone.getValue();
      if (currentState.isRunning) {
        void zone.stop();
      } else {
        void zone.start();
      }
    },
    [heaterSystem]
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header with settings button */}
        <View style={styles.header}>
          <Text style={styles.title}>Chauffage</Text>
          <Pressable
            onPress={() => router.push("/heater-settings")}
            style={styles.iconButton}
            hitSlop={10}
          >
            <View style={styles.iconCircle}>
              <IconSymbol name="settings" size={18} color="#FFFFFF" />
              {isLoading ? (
                <View style={styles.badgeContainer}>
                  <ActivityIndicator size={10} color="#FFFFFF" />
                </View>
              ) : (
                <View
                  style={[
                    styles.badge,
                    { backgroundColor: isConnected ? "#2ECC71" : "#E74C3C" },
                  ]}
                />
              )}
            </View>
          </Pressable>
        </View>

        {/* 2x2 Grid of Circular Dials */}
        <View style={styles.content}>
          <View style={styles.zonesRow}>
            <View style={styles.dialWrapper}>
              <CircularTemperatureDial
                name={ZONE_NAMES[0]}
                zoneState={isConnected ? zones[0] : DEFAULT_ZONE_STATE}
                onSetpointChange={(newSetpoint) =>
                  handleSetpointChange(0, newSetpoint)
                }
                onToggle={() => handleToggle(0)}
              />
            </View>
            <View style={styles.dialWrapper}>
              <CircularTemperatureDial
                name={ZONE_NAMES[1]}
                zoneState={isConnected ? zones[1] : DEFAULT_ZONE_STATE}
                onSetpointChange={(newSetpoint) =>
                  handleSetpointChange(1, newSetpoint)
                }
                onToggle={() => handleToggle(1)}
              />
            </View>
          </View>
          <View style={styles.zonesRow}>
            <View style={styles.dialWrapper}>
              <CircularTemperatureDial
                name={ZONE_NAMES[2]}
                zoneState={isConnected ? zones[2] : DEFAULT_ZONE_STATE}
                onSetpointChange={(newSetpoint) =>
                  handleSetpointChange(2, newSetpoint)
                }
                onToggle={() => handleToggle(2)}
              />
            </View>
            <View style={styles.dialWrapper}>
              <CircularTemperatureDial
                name={ZONE_NAMES[3]}
                zoneState={isConnected ? zones[3] : DEFAULT_ZONE_STATE}
                onSetpointChange={(newSetpoint) =>
                  handleSetpointChange(3, newSetpoint)
                }
                onToggle={() => handleToggle(3)}
              />
            </View>
          </View>
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
      paddingHorizontal: 16,
      paddingBottom: 16,
      gap: 8,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 8,
    },
    title: {
      fontSize: 38,
      fontWeight: "900",
      color: "#FFFFFF",
      letterSpacing: -1,
    },
    iconButton: {
      borderRadius: 999,
    },
    iconCircle: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: "rgba(255, 255, 255, 0.08)",
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
    badgeContainer: {
      position: "absolute",
      top: 6,
      right: 6,
      width: 10,
      height: 10,
      justifyContent: "center",
      alignItems: "center",
    },
    zonesRow: {
      flex: 1,
      flexDirection: "row",
      gap: 8,
    },
    dialWrapper: {
      flex: 1,
    },
  });
