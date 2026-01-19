import { StyleSheet, Text, View } from "react-native";
import { FontSize, Spacing, type ThemeColors } from "@/design-system";
import { useThemeColor } from "@/hooks/use-theme-color";

type Props = {
  isScanning: boolean;
  lastError: string | null;
};

export function ScanSection({ isScanning, lastError }: Props) {
  const colors = useThemeColor();
  const styles = getStyles(colors);

  if (!lastError && !isScanning) return null;

  return (
    <View style={styles.section}>
      {lastError ? <Text style={styles.error}>{lastError}</Text> : null}
    </View>
  );
}

const getStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    section: {
      paddingHorizontal: Spacing.xxl,
      paddingBottom: Spacing.l,
      gap: Spacing.s,
    },
    error: {
      color: colors.danger["500"],
      fontSize: FontSize.xs,
    },
  });
