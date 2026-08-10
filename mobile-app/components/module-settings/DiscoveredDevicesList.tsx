import { useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet } from "react-native";
import {
  DeviceRow,
  IconSymbol,
  Section,
  Spacing,
  useThemeColor,
} from "@/design-system";
import type { DiscoveredBluetoothDevice } from "@/domain/ports/BluetoothScanner";

type Props = {
  isScanning: boolean;
  discoveredDevices: DiscoveredBluetoothDevice[];
  onConnect: (deviceId: string) => Promise<void>;
};

export function DiscoveredDevicesList({
  isScanning,
  discoveredDevices,
  onConnect,
}: Props) {
  const colors = useThemeColor();
  const [connectingId, setConnectingId] = useState<string | null>(null);

  return (
    <>
      <Section title="Périphériques trouvés" isScanning={isScanning}>
        <FlatList
          data={discoveredDevices}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const name = item.name ?? "Unknown";
            const isConnecting = connectingId === item.id;

            return (
              <DeviceRow
                name={name}
                subtitle={item.id}
                onPress={async () => {
                  try {
                    setConnectingId(item.id);
                    await onConnect(item.id);
                  } finally {
                    setConnectingId(null);
                  }
                }}
              >
                {isConnecting ? (
                  <ActivityIndicator size="small" color={colors.text.primary} />
                ) : (
                  <IconSymbol
                    name="chevron-right"
                    size={22}
                    color={colors.text.primary}
                  />
                )}
              </DeviceRow>
            );
          }}
        />
      </Section>
    </>
  );
}

const styles = StyleSheet.create({
  listContent: {
    gap: Spacing.m,
  },
});
