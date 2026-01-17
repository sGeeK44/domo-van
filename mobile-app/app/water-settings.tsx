import { AdminSection } from "@/app/_components/water-settings/AdminSection";
import { DiscoveredDevicesList } from "@/app/_components/water-settings/DiscoveredDevicesList";
import { SavedDeviceSection } from "@/app/_components/water-settings/SavedDeviceSection";
import { ScanSection } from "@/app/_components/water-settings/ScanSection";
import { getWaterSettingsStyles } from "@/app/_components/water-settings/styles";
import { TankSettingsSection } from "@/app/_components/water-settings/TankSettingsSection";
import { useAutoScanWithTimeout } from "@/app/_components/water-settings/useAutoScanWithTimeout";
import { ValveSettingsSection } from "@/app/_components/water-settings/ValveSettingsSection";
import { useBle } from "@/components/BleProvider";
import { DiscoveredBluetoothDevice } from "@/core/bluetooth/Bluetooth";
import { IconSymbol } from "@/design-system/atoms/icon-symbol";
import { WaterSystem } from "@/domain/water/WaterSystem";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useConnectedDevice } from "@/hooks/useConnectedDevice";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function WaterSettingsScreen() {
  const colors = useThemeColor();
  const styles = getWaterSettingsStyles(colors);
  const router = useRouter();

  // Bluetooth for scanning and connecting
  const { bluetooth } = useBle();

  // Connection state from hook (state-only)
  const { device, setDevice, isConnected, lastDevice, forgetDevice } =
    useConnectedDevice();

  // Local scanning state
  const [isScanning, setIsScanning] = useState(false);
  const [discoveredDevices, setDiscoveredDevices] = useState<
    DiscoveredBluetoothDevice[]
  >([]);
  const [lastError, setLastError] = useState<string | null>(null);

  const isModuleConnected = isConnected && device != null;

  // Scanning functions
  const startScan = useCallback(async () => {
    setDiscoveredDevices([]);
    setLastError(null);
    setIsScanning(true);
    try {
      await bluetooth.startScan(WaterSystem.serviceUuid, (foundDevice) => {
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
    [bluetooth, setDevice, stopScan]
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
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <IconSymbol name="arrow-back" size={22} color="#FFFFFF" />
        </Pressable>
        <Text style={styles.title}>Bluetooth</Text>
        <View style={{ width: 22 }} />
      </View>

      {lastDevice ? (
        <ScrollView>
          <SavedDeviceSection
            styles={styles}
            device={lastDevice}
            isConnected={isModuleConnected}
            onConnect={connect}
            onDisconnect={disconnect}
            onForget={forgetDevice}
          />
          {isModuleConnected && device && (
            <>
              <AdminSection styles={styles} connectedDevice={device} />
              <TankSettingsSection
                styles={styles}
                connectedDevice={device}
                name="clean"
              />
              <TankSettingsSection
                styles={styles}
                connectedDevice={device}
                name="grey"
              />
              <ValveSettingsSection styles={styles} connectedDevice={device} />
            </>
          )}
        </ScrollView>
      ) : (
        <View style={{ flex: 1 }}>
          <ScanSection
            styles={styles}
            isScanning={isScanning}
            lastError={lastError}
          />

          <DiscoveredDevicesList
            styles={styles}
            isScanning={isScanning}
            discoveredDevices={discoveredDevices}
            onConnect={connect}
          />

          <View style={styles.bottomButtonContainer}>
            <Pressable onPress={onToggleScan} style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>
                {isScanning ? "Arrêter la recherche" : "Rechercher"}
              </Text>
            </Pressable>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}
