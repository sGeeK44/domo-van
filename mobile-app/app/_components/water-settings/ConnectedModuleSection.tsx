import type { WaterSettingsStyles } from "@/app/_components/water-settings/styles";
import { Pressable, Text, View } from "react-native";

type BleDevice = {
  id: string;
  name?: string | null;
};

type Props = {
  styles: WaterSettingsStyles;
  connectedDevice: BleDevice;
  lastError: string | null;
  onDisconnect: () => void;
};

export function ConnectedModuleSection({
  styles,
  connectedDevice,
  lastError,
  onDisconnect,
}: Props) {
  return (
    <View style={styles.section}>
      <Text style={styles.status}>
        {`Connecté à: ${connectedDevice.name ?? connectedDevice.id}`}
      </Text>

      {lastError ? <Text style={styles.error}>{lastError}</Text> : null}

      <View style={styles.actionsRow}>
        <Pressable onPress={onDisconnect} style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>Déconnecter</Text>
        </Pressable>
      </View>
    </View>
  );
}
