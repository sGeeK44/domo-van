import { Pressable, Text, View } from "react-native";
import type { WaterSettingsStyles } from "@/app/_components/water-settings/styles";

type Props = {
  styles: WaterSettingsStyles;
  isScanning: boolean;
  lastError: string | null;
  onToggleScan: () => void;
};

export function ScanSection({
  styles,
  isScanning,
  lastError,
  onToggleScan,
}: Props) {
  return (
    <View style={styles.section}>
      <Text style={styles.status}>Non connecté</Text>
      {lastError ? <Text style={styles.error}>{lastError}</Text> : null}

      <View style={styles.actionsRow}>
        <Pressable onPress={onToggleScan} style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>
            {isScanning ? "Arrêter la recherche" : "Rechercher"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
