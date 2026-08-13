import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { HeaterPidSection } from "@/components/heater-settings";
import {
  AdminSection,
  DiscoveredDevicesList,
  SavedDeviceSection,
  ScanSection,
} from "@/components/module-settings";
import { useContainer } from "@/composition/ContainerProvider";
import {
  useModuleRegistry,
  useModuleSlot,
} from "@/composition/ModuleRegistryProvider";
import { useHeaterSystem } from "@/composition/ModuleSystemsProvider";
import {
  Button,
  SettingsHeader,
  Spacing,
  type ThemeColors,
  useThemeColor,
} from "@/design-system";
import { HEATER_MODULE } from "@/domain/modules/ModuleDescriptor";
import type { DiscoveredBluetoothDevice } from "@/domain/ports/BluetoothScanner";
import { useAutoScanWithTimeout } from "@/screens/hooks/useAutoScanWithTimeout";

const ZONE_NAMES = ["Cabine", "Cellule", "Soute", "Garage"];

export default function HeaterSettingsScreen() {
  const colors = useThemeColor();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();

  // Bluetooth for scanning and connecting
  const { bluetooth } = useContainer();

  const { pairing, link } = useModuleSlot(HEATER_MODULE.key);
  const { pair, unpair, reconnect } = useModuleRegistry();

  // Local scanning state
  const [isScanning, setIsScanning] = useState(false);
  const [discoveredDevices, setDiscoveredDevices] = useState<
    DiscoveredBluetoothDevice[]
  >([]);
  const [lastError, setLastError] = useState<string | null>(null);

  const isModuleConnected = link.status === "online";

  const heaterSystem = useHeaterSystem();

  // Scanning functions
  const startScan = useCallback(async () => {
    setDiscoveredDevices([]);
    setLastError(null);
    setIsScanning(true);
    try {
      await bluetooth.startScan(
        [HEATER_MODULE.scanServiceUuid],
        (foundDevice) => {
          setDiscoveredDevices((prev) => {
            if (prev.some((d) => d.id === foundDevice.id)) return prev;
            return [...prev, foundDevice];
          });
        },
      );
    } catch (e) {
      setLastError(e instanceof Error ? e.message : "Scan failed");
      setIsScanning(false);
    }
  }, [bluetooth]);

  const stopScan = useCallback(async () => {
    await bluetooth.stopScan();
    setIsScanning(false);
  }, [bluetooth]);

  // Ensure scanning stops when leaving the screen
  useEffect(() => {
    return () => {
      void bluetooth.stopScan();
    };
  }, [bluetooth]);

  // Auto scan only when no saved device; stop after 30s
  useAutoScanWithTimeout({
    enabled: !pairing,
    isScanning,
    startScan,
    stopScan,
    timeoutMs: 30_000,
  });

  const onToggleScan = () => {
    if (isScanning) void stopScan();
    else void startScan();
  };

  const pairDevice = useCallback(
    async (deviceId: string) => {
      await stopScan();
      const found = discoveredDevices.find(
        (candidate) => candidate.id === deviceId,
      );
      if (!found) return;
      try {
        await pair(HEATER_MODULE.key, found);
      } catch (e) {
        setLastError(e instanceof Error ? e.message : "Pairing failed");
      }
    },
    [discoveredDevices, pair, stopScan],
  );

  const reconnectModule = useCallback(
    () => reconnect(HEATER_MODULE.key),
    [reconnect],
  );

  // Goes straight to the radio: the registry only ever connects, and sees the drop
  const disconnect = useCallback(async () => {
    if (pairing) await bluetooth.disconnect(pairing);
  }, [bluetooth, pairing]);

  const forget = useCallback(() => unpair(HEATER_MODULE.key), [unpair]);

  return (
    <SafeAreaView style={styles.container}>
      <SettingsHeader
        title="Chauffage - Bluetooth"
        onBackPress={() => router.back()}
      />

      {pairing ? (
        <ScrollView>
          <SavedDeviceSection
            device={pairing}
            isConnected={isModuleConnected}
            onConnect={reconnectModule}
            onDisconnect={disconnect}
            onForget={forget}
          />
          {isModuleConnected && heaterSystem && (
            <>
              <AdminSection
                adminModule={heaterSystem.admin}
                deviceName={pairing.name}
              />
              {heaterSystem.zones.map((zone, index) => (
                <HeaterPidSection
                  key={index}
                  heaterZone={zone}
                  zoneName={ZONE_NAMES[index]}
                />
              ))}
            </>
          )}
        </ScrollView>
      ) : (
        <View style={{ flex: 1 }}>
          <ScanSection isScanning={isScanning} lastError={lastError} />

          <DiscoveredDevicesList
            isScanning={isScanning}
            discoveredDevices={discoveredDevices}
            onConnect={pairDevice}
          />

          <View style={styles.bottomButtonContainer}>
            <Button onPress={onToggleScan}>
              {isScanning ? "Arrêter la recherche" : "Rechercher"}
            </Button>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background.primary,
    },
    bottomButtonContainer: {
      marginTop: "auto",
      paddingHorizontal: Spacing.xxl,
      paddingBottom: Spacing.xxl,
    },
  });
