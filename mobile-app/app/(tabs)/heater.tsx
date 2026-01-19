import { CircularTemperatureDial } from "@/components/heater/circular-temperature-dial";
import { Observable } from "@/core/observable";
import { Colors } from "@/design-system";
import { PageHeader } from "@/design-system/molecules/page-header";
import { HeaterSystem } from "@/domain/heater/HeaterSystem";
import { HeaterZoneSnapshot } from "@/domain/heater/HeaterZone";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useMultiModuleConnection } from "@/hooks/useMultiModuleConnection";
import { useHeaterDevice } from "@/hooks/useModuleDevice";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";
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

  const { device, isConnected } = useHeaterDevice();
  const { globalStatus, connectAll, disconnectAll } = useMultiModuleConnection();

  const handleBluetoothPress = () => {
    if (globalStatus === "connected" || globalStatus === "partial") {
      void disconnectAll();
    } else {
      void connectAll();
    }
  };

  const bluetoothStatus = globalStatus === "connecting" ? "loading" : globalStatus;

  // Create HeaterSystem when device is connected
  const heaterSystem = useMemo(
    () => (device ? new HeaterSystem(device) : null),
    [device],
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
    [heaterSystem],
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
    [heaterSystem],
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={{ flex: 1 }}>
        <PageHeader
          title="Chauffage"
          onSettingsPress={() => router.push("/heater-settings")}
          onBluetoothPress={handleBluetoothPress}
          bluetoothStatus={bluetoothStatus}
        />

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
    zonesRow: {
      flex: 1,
      flexDirection: "row",
      gap: 8,
    },
    dialWrapper: {
      flex: 1,
    },
  });
