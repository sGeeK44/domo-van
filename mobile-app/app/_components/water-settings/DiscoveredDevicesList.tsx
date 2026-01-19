import { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  View,
} from "react-native";
import type { WaterSettingsStyles } from "@/app/_components/water-settings/styles";
import { IconSymbol } from "@/design-system/atoms/icon-symbol";

type BleDevice = {
  id: string;
  name?: string | null;
};
type Props = {
  styles: WaterSettingsStyles;
  isScanning: boolean;
  discoveredDevices: BleDevice[];
  onConnect: (deviceId: string) => Promise<void>;
};

export function DiscoveredDevicesList({
  styles,
  isScanning,
  discoveredDevices,
  onConnect,
}: Props) {
  const [connectingId, setConnectingId] = useState<string | null>(null);

  return (
    <>
      <View style={styles.listHeader}>
        <Text style={styles.listTitle}>Périphériques trouvés</Text>
        {isScanning ? (
          <View style={styles.scanningPill}>
            <ActivityIndicator size="small" color="#FFFFFF" />
            <Text style={styles.scanningText}>Scan…</Text>
          </View>
        ) : null}
      </View>

      <FlatList
        data={discoveredDevices}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const name = item.name ?? "Unknown";
          const isConnecting = connectingId === item.id;

          return (
            <Pressable
              onPress={async () => {
                try {
                  setConnectingId(item.id);
                  await onConnect(item.id);
                } finally {
                  setConnectingId(null);
                }
              }}
              style={styles.deviceRow}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.deviceName}>{name}</Text>
                <Text style={styles.deviceId}>{item.id}</Text>
              </View>
              {isConnecting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <IconSymbol name="chevron-right" size={22} color="#FFFFFF" />
              )}
            </Pressable>
          );
        }}
      />
    </>
  );
}
