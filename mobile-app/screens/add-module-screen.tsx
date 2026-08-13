import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { DiscoveredModuleRow } from "@/components/modules";
import { useContainer } from "@/composition/ContainerProvider";
import {
  useModuleRegistry,
  useModuleSlots,
} from "@/composition/ModuleRegistryProvider";
import {
  FontSize,
  SettingsHeader,
  Spacing,
  type ThemeColors,
  useThemeColor,
} from "@/design-system";
import {
  ALL_SCAN_SERVICE_UUIDS,
  type ModuleKey,
} from "@/domain/modules/ModuleDescriptor";
import type { DiscoveredBluetoothDevice } from "@/domain/ports/BluetoothScanner";

const SCAN_TIMEOUT_MS = 30_000;

export default function AddModuleScreen() {
  const colors = useThemeColor();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();

  const { bluetooth } = useContainer();
  const slots = useModuleSlots();
  const { pair } = useModuleRegistry();

  const [found, setFound] = useState<readonly DiscoveredBluetoothDevice[]>([]);
  const [isScanning, setIsScanning] = useState(true);
  const [pairingId, setPairingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsScanning(false);
      void bluetooth.stopScan();
    }, SCAN_TIMEOUT_MS);

    const remember = (device: DiscoveredBluetoothDevice) =>
      setFound((seen) =>
        seen.some((known) => known.id === device.id) ? seen : [...seen, device],
      );

    bluetooth
      .startScan(ALL_SCAN_SERVICE_UUIDS, remember)
      .catch((cause: unknown) => {
        setIsScanning(false);
        setError(message(cause, "La recherche a échoué."));
      });

    return () => {
      clearTimeout(timer);
      void bluetooth.stopScan();
    };
  }, [bluetooth]);

  const occupiedKeys = slots
    .filter((slot) => slot.pairing !== null)
    .map((slot) => slot.module.key);

  const pairDevice = async (
    key: ModuleKey,
    device: DiscoveredBluetoothDevice,
  ) => {
    setPairingId(device.id);
    setError(null);
    try {
      await pair(key, device);
      router.back();
    } catch (cause: unknown) {
      setError(message(cause, "L'appairage a échoué."));
    } finally {
      setPairingId(null);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <SettingsHeader title="Ajouter" onBackPress={() => router.back()} />

      <ScrollView contentContainerStyle={styles.list}>
        <Text style={styles.status}>
          {isScanning ? "Recherche en cours…" : "Recherche terminée"}
        </Text>
        {error && <Text style={styles.error}>{error}</Text>}

        {found.map((device) => (
          <DiscoveredModuleRow
            key={device.id}
            device={device}
            occupiedKeys={occupiedKeys}
            isPairing={pairingId === device.id}
            onPair={pairDevice}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function message(cause: unknown, fallback: string): string {
  return cause instanceof Error ? cause.message : fallback;
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background.primary,
    },
    list: {
      paddingHorizontal: Spacing.xxl,
      paddingBottom: Spacing.xxl,
      gap: Spacing.m,
    },
    status: {
      color: colors.text.secondary,
      fontSize: FontSize.xs,
    },
    error: {
      color: colors.danger["500"],
      fontSize: FontSize.xs,
    },
  });
