import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  AdminSection,
  DiscoveredDevicesList,
  SavedDeviceSection,
  ScanSection,
} from "@/components/module-settings";
import { TankSettingsSection } from "@/components/water-settings/TankSettingsSection";
import { ValveSettingsSection } from "@/components/water-settings/ValveSettingsSection";
import { useContainer } from "@/composition/ContainerProvider";
import { useWaterDevice } from "@/composition/connection/useModuleDevice";
import { useWaterSystem } from "@/composition/ModuleSystemsProvider";
import {
  Button,
  SettingsHeader,
  Spacing,
  type ThemeColors,
  useThemeColor,
} from "@/design-system";
import { WATER_MODULE } from "@/domain/modules/ModuleDescriptor";
import type { DiscoveredBluetoothDevice } from "@/domain/ports/BluetoothScanner";
import { useAutoScanWithTimeout } from "@/screens/hooks/useAutoScanWithTimeout";

export default function WaterSettingsScreen() {
  const colors = useThemeColor();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();

  // Bluetooth for scanning and connecting
  const { bluetooth } = useContainer();

  // Connection state from hook (state-only)
  const { device, setDevice, isConnected, lastDevice, forgetDevice } =
    useWaterDevice();

  // Local scanning state
  const [isScanning, setIsScanning] = useState(false);
  const [discoveredDevices, setDiscoveredDevices] = useState<
    DiscoveredBluetoothDevice[]
  >([]);
  const [lastError, setLastError] = useState<string | null>(null);

  const isModuleConnected = isConnected && device != null;

  const waterSystem = useWaterSystem();

  // Scanning functions
  const startScan = useCallback(async () => {
    setDiscoveredDevices([]);
    setLastError(null);
    setIsScanning(true);
    try {
      await bluetooth.startScan(WATER_MODULE.scanServiceUuid, (foundDevice) => {
        setDiscoveredDevices((prev) => {
          if (prev.some((d) => d.id === foundDevice.id)) return prev;
          return [...prev, foundDevice];
        });
      });
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
    enabled: !lastDevice,
    isScanning,
    startScan,
    stopScan,
    timeoutMs: 30_000,
  });

  const onToggleScan = () => {
    if (isScanning) void stopScan();
    else void startScan();
  };

  // Connect using Bluetooth, store in context
  const connect = useCallback(
    async (deviceId: string) => {
      await stopScan();
      try {
        const connectedDevice = await bluetooth.connect(deviceId);
        await connectedDevice.discoverAllServicesAndCharacteristics();
        setDevice(connectedDevice);
      } catch (e) {
        setLastError(e instanceof Error ? e.message : "Connection failed");
      }
    },
    [bluetooth, setDevice, stopScan],
  );

  // Disconnect
  const disconnect = useCallback(async () => {
    if (device) {
      await device.cancelConnection();
      setDevice(null);
    }
  }, [device, setDevice]);

  return (
    <SafeAreaView style={styles.container}>
      <SettingsHeader title="Bluetooth" onBackPress={() => router.back()} />

      {lastDevice ? (
        <ScrollView>
          <SavedDeviceSection
            device={lastDevice}
            isConnected={isModuleConnected}
            onConnect={connect}
            onDisconnect={disconnect}
            onForget={forgetDevice}
          />
          {isModuleConnected && device && waterSystem && (
            <>
              <AdminSection
                adminModule={waterSystem.admin}
                deviceName={device.name}
              />
              <TankSettingsSection
                tank={waterSystem.cleanTank}
                label="Eau Propre"
              />
              <TankSettingsSection
                tank={waterSystem.greyTank}
                label="Eau Grise"
              />
              <ValveSettingsSection valve={waterSystem.greyDrainValve} />
            </>
          )}
        </ScrollView>
      ) : (
        <View style={{ flex: 1 }}>
          <ScanSection isScanning={isScanning} lastError={lastError} />

          <DiscoveredDevicesList
            isScanning={isScanning}
            discoveredDevices={discoveredDevices}
            onConnect={connect}
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
