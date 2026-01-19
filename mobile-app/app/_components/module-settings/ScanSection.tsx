import { Text, View } from "react-native";
import type { ModuleSettingsStyles } from "@/app/_components/module-settings/styles";

type Props = {
  styles: ModuleSettingsStyles;
  isScanning: boolean;
  lastError: string | null;
};

export function ScanSection({ styles, isScanning, lastError }: Props) {
  if (!lastError && !isScanning) return null;

  return (
    <View style={styles.section}>
      {lastError ? <Text style={styles.error}>{lastError}</Text> : null}
    </View>
  );
}
