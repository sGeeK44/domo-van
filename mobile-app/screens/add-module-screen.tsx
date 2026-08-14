import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { DiscoveredModuleRow } from "@/components/modules";
import { useContainer } from "@/composition/ContainerProvider";
import {
  useModuleRegistry,
  useModuleSlots,
} from "@/composition/ModuleRegistryProvider";
import {
  Button,
  FontSize,
  SettingsHeader,
  Spacing,
  type ThemeColors,
  useThemeColor,
} from "@/design-system";
import {
  ALL_SCAN_SERVICE_UUIDS,
  type ModuleKey,
  moduleForAdvertisement,
} from "@/domain/modules/ModuleDescriptor";
import type { DiscoveredBluetoothDevice } from "@/domain/ports/BluetoothScanner";
import { message } from "@/screens/error-message";

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
  const isMounted = useRef(true);
  const stopRunningScan = useRef(() => {});

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const scan = useCallback(() => {
    let cancelled = false;

    setFound([]);
    setError(null);
    setIsScanning(true);

    const remember = (device: DiscoveredBluetoothDevice) => {
      if (!moduleForAdvertisement(device.serviceUuids)) return;
      setFound((seen) =>
        seen.some((known) => known.id === device.id) ? seen : [...seen, device],
      );
    };

    const started = bluetooth
      .startScan(ALL_SCAN_SERVICE_UUIDS, remember)
      .catch((cause: unknown) => {
        if (cancelled) return;
        setIsScanning(false);
        setError(message(cause, "La recherche a échoué."));
      });

    // the radio only starts scanning once the permission round-trip resolves, which outlives both the timeout and the screen
    const stopRadio = () => {
      cancelled = true;
      void started.then(() => bluetooth.stopScan());
    };

    const timer = setTimeout(() => {
      setIsScanning(false);
      stopRadio();
    }, SCAN_TIMEOUT_MS);

    stopRunningScan.current = () => {
      clearTimeout(timer);
      stopRadio();
    };
  }, [bluetooth]);

  useEffect(() => {
    scan();
    return () => stopRunningScan.current();
  }, [scan]);

  const rescan = () => {
    stopRunningScan.current();
    scan();
  };

  const pairDevice = async (
    key: ModuleKey,
    device: DiscoveredBluetoothDevice,
  ) => {
    setPairingId(device.id);
    setError(null);
    try {
      await pair(key, device);
      if (isMounted.current) router.back();
    } catch (cause: unknown) {
      if (isMounted.current) setError(message(cause, "L'appairage a échoué."));
    } finally {
      if (isMounted.current) setPairingId(null);
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
            slots={slots}
            isPairing={pairingId === device.id}
            onPair={pairDevice}
          />
        ))}

        {!isScanning && found.length === 0 && (
          <Text style={styles.empty}>Aucun module trouvé.</Text>
        )}

        {!isScanning && (
          <Button testID="rescan" variant="secondary" onPress={rescan}>
            Relancer la recherche
          </Button>
        )}
      </ScrollView>
    </SafeAreaView>
  );
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
    empty: {
      color: colors.text.secondary,
      fontSize: FontSize.m,
    },
  });
