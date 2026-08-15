import { StyleSheet, View } from "react-native";
import { IconCircleButton } from "@/design-system/atoms/icon-circle-button";
import { PageTitle } from "@/design-system/atoms/page-title";
import {
  StatusBadge,
  type StatusBadgeProps,
} from "@/design-system/atoms/status-badge";
import { Spacing } from "@/design-system/tokens";

/** The mockup gives every header one chip: `settings` on Bord, `tune` on a module tab. */
export type SettingsIcon = "settings" | "tune";

export type PageHeaderProps = {
  title: string;
  /** A page with nothing to configure drops this button. */
  onSettingsPress?: () => void;
  settingsIcon?: SettingsIcon;
  /** A page whose modules each show their own status has no global button. */
  onBluetoothPress?: () => void;
  bluetoothStatus?: StatusBadgeProps["status"];
  bluetoothDisabled?: boolean;
};

export function PageHeader({
  title,
  onSettingsPress,
  settingsIcon = "settings",
  onBluetoothPress,
  bluetoothStatus,
  bluetoothDisabled = false,
}: PageHeaderProps) {
  return (
    <View style={styles.header}>
      <PageTitle>{title}</PageTitle>
      <View style={styles.buttons}>
        {onBluetoothPress && bluetoothStatus && (
          <IconCircleButton
            icon="bluetooth"
            onPress={onBluetoothPress}
            disabled={bluetoothDisabled}
          >
            <StatusBadge status={bluetoothStatus} />
          </IconCircleButton>
        )}
        {onSettingsPress && (
          <IconCircleButton
            testID="page-settings"
            icon={settingsIcon}
            onPress={onSettingsPress}
          />
        )}
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
