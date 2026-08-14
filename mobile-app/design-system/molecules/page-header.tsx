import { StyleSheet, View } from "react-native";
import { IconCircleButton } from "@/design-system/atoms/icon-circle-button";
import { PageTitle } from "@/design-system/atoms/page-title";
import {
  StatusBadge,
  type StatusBadgeProps,
} from "@/design-system/atoms/status-badge";
import { useTheme } from "@/design-system/theme/ThemeContext";
import { Spacing } from "@/design-system/tokens";

export type PageHeaderProps = {
  title: string;
  onSettingsPress: () => void;
  /** A page whose modules each show their own status has no global button. */
  onBluetoothPress?: () => void;
  bluetoothStatus?: StatusBadgeProps["status"];
  bluetoothDisabled?: boolean;
};

export function PageHeader({
  title,
  onSettingsPress,
  onBluetoothPress,
  bluetoothStatus,
  bluetoothDisabled = false,
}: PageHeaderProps) {
  const { colorScheme, setThemeMode } = useTheme();

  return (
    <View style={styles.header}>
      <PageTitle>{title}</PageTitle>
      <View style={styles.buttons}>
        <IconCircleButton
          icon={colorScheme === "dark" ? "light-mode" : "dark-mode"}
          onPress={() =>
            setThemeMode(colorScheme === "dark" ? "light" : "dark")
          }
        />
        {onBluetoothPress && bluetoothStatus && (
          <IconCircleButton
            icon="bluetooth"
            onPress={onBluetoothPress}
            disabled={bluetoothDisabled}
          >
            <StatusBadge status={bluetoothStatus} />
          </IconCircleButton>
        )}
        <IconCircleButton icon="settings" onPress={onSettingsPress} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.m,
  },
  buttons: {
    flexDirection: "row",
    gap: Spacing.s,
  },
});
