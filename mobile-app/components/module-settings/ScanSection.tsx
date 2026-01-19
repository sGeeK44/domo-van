import { StyleSheet, Text, View } from "react-native";
import { FontSize, Spacing, TextColors } from "@/design-system";

type Props = {
  isScanning: boolean;
  lastError: string | null;
};

export function ScanSection({ isScanning, lastError }: Props) {
  if (!lastError && !isScanning) return null;

  return (
    <View style={styles.section}>
      {lastError ? <Text style={styles.error}>{lastError}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: Spacing.xxl,
    paddingBottom: Spacing.l,
    gap: Spacing.s,
  },
  error: {
    color: TextColors.error,
    fontSize: FontSize.xs,
  },
});
