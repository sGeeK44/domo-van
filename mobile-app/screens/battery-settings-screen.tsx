import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  DiscoveredDevicesList,
  SavedDeviceSection,
  ScanSection,
} from "@/components/module-settings";
import { useContainer } from "@/composition/ContainerProvider";
import { useBatteryDevice } from "@/composition/connection/useModuleDevice";
import { useBatterySystem } from "@/composition/ModuleSystemsProvider";
import { useObservable } from "@/core/react/useObservable";
import {
  Button,
  FontSize,
  SettingsHeader,
  Spacing,
  type ThemeColors,
  useThemeColor,
} from "@/design-system";
import {
  BatterySnapshot,
  DEFAULT_BATTERY_SNAPSHOT,
} from "@/domain/battery/BatteryTelemetry";
import { BATTERY_MODULE } from "@/domain/modules/ModuleDescriptor";
import type { DiscoveredBluetoothDevice } from "@/domain/ports/BluetoothScanner";
import { useAutoScanWithTimeout } from "@/screens/hooks/useAutoScanWithTimeout";

export default function BatterySettingsScreen() {
  const colors = useThemeColor();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();

  // Bluetooth for scanning and connecting
  const { bluetooth } = useContainer();

  // Connection state from battery device hook
  const { device, setDevice, isConnected, lastDevice, forgetDevice } =
    useBatteryDevice();

  // Local scanning state
  const [isScanning, setIsScanning] = useState(false);
  const [discoveredDevices, setDiscoveredDevices] = useState<
    DiscoveredBluetoothDevice[]
  >([]);
  const [lastError, setLastError] = useState<string | null>(null);

  const isModuleConnected = isConnected && device != null;

  const batterySystem = useBatterySystem();

  // Subscribe to battery data
  const battery = useObservable(batterySystem, DEFAULT_BATTERY_SNAPSHOT);

  // Scanning functions - scan for JK BMS service UUID
  const startScan = useCallback(async () => {
    setDiscoveredDevices([]);
    setLastError(null);
    setIsScanning(true);
    try {
      await bluetooth.startScan(
        BATTERY_MODULE.scanServiceUuid,
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
      <SettingsHeader
        title="Batterie - Bluetooth"
        onBackPress={() => router.back()}
      />

      {lastDevice ? (
        <ScrollView>
          <SavedDeviceSection
            device={lastDevice}
            isConnected={isModuleConnected}
            onConnect={connect}
            onDisconnect={disconnect}
            onForget={forgetDevice}
          />
          {isModuleConnected && (
            <BatteryInfoSection battery={battery} colors={colors} />
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

type BatteryInfoSectionProps = {
  battery: BatterySnapshot;
  colors: ThemeColors;
};

function BatteryInfoSection({ battery, colors }: BatteryInfoSectionProps) {
  const styles = useMemo(() => createInfoStyles(colors), [colors]);

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Informations Batterie</Text>

      <View style={styles.row}>
        <Text style={styles.label}>État de charge</Text>
        <Text style={styles.value}>{battery.percentage}%</Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Tension totale</Text>
        <Text style={styles.value}>{battery.voltage.toFixed(2)} V</Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Courant</Text>
        <Text style={styles.value}>{battery.current.toFixed(2)} A</Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Puissance</Text>
        <Text style={styles.value}>{battery.power.toFixed(0)} W</Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Température MOS</Text>
        <Text style={styles.value}>{battery.tempMos}°C</Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Température cellule 1</Text>
        <Text style={styles.value}>{battery.tempCell1}°C</Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Température cellule 2</Text>
        <Text style={styles.value}>{battery.tempCell2}°C</Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Nombre de cellules</Text>
        <Text style={styles.value}>{battery.cellCount}</Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Tension min cellule</Text>
        <Text style={styles.value}>{battery.minCellVoltage.toFixed(3)} V</Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Tension max cellule</Text>
        <Text style={styles.value}>{battery.maxCellVoltage.toFixed(3)} V</Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Delta cellules</Text>
        <Text style={styles.value}>
          {(battery.cellDelta * 1000).toFixed(0)} mV
        </Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Cycles</Text>
        <Text style={styles.value}>{battery.cycleCount}</Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Capacité</Text>
        <Text style={styles.value}>{battery.capacityAh.toFixed(1)} Ah</Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>En charge</Text>
        <Text style={styles.value}>{battery.isCharging ? "Oui" : "Non"}</Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>En décharge</Text>
        <Text style={styles.value}>
          {battery.isDischarging ? "Oui" : "Non"}
        </Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Équilibrage</Text>
        <Text style={styles.value}>
          {battery.balancing ? "Actif" : "Inactif"}
        </Text>
      </View>

      {battery.hasAlarm && (
        <View style={styles.alarmRow}>
          <Text style={styles.alarmLabel}>Alarmes</Text>
          <Text style={styles.alarmValue}>{battery.alarms.join(", ")}</Text>
        </View>
      )}
    </View>
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

const createInfoStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    section: {
      padding: Spacing.l,
      backgroundColor: colors.background.secondary,
      marginHorizontal: Spacing.l,
      marginTop: Spacing.l,
      borderRadius: 12,
    },
    sectionTitle: {
      fontSize: FontSize.l,
      fontWeight: "600",
      color: colors.text.primary,
      marginBottom: Spacing.m,
    },
    row: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingVertical: Spacing.xs,
    },
    label: {
      fontSize: FontSize.m,
      color: colors.text.secondary,
    },
    value: {
      fontSize: FontSize.m,
      color: colors.text.primary,
      fontWeight: "500",
    },
    alarmRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingVertical: Spacing.xs,
      marginTop: Spacing.s,
      paddingTop: Spacing.s,
      borderTopWidth: 1,
      borderTopColor: colors.danger["500"],
    },
    alarmLabel: {
      fontSize: FontSize.m,
      color: colors.danger["500"],
      fontWeight: "600",
    },
    alarmValue: {
      fontSize: FontSize.m,
      color: colors.danger["500"],
    },
  });
