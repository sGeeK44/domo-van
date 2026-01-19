import { StyleSheet, View } from "react-native";
import { PageTitle } from "@/design-system/atoms/page-title";
import { IconCircleButton } from "@/design-system/atoms/icon-circle-button";
import { StatusBadge, type StatusBadgeProps } from "@/design-system/atoms/status-badge";
import { Spacing } from "@/design-system/theme";

export type PageHeaderProps = {
  title: string;
  onSettingsPress: () => void;
  onBluetoothPress: () => void;
  bluetoothStatus: StatusBadgeProps["status"];
};

export function PageHeader({
  title,
  onSettingsPress,
  onBluetoothPress,
  bluetoothStatus,
}: PageHeaderProps) {
  return (
    <View style={styles.header}>
      <PageTitle>{title}</PageTitle>
      <View style={styles.buttons}>
        <IconCircleButton icon="bluetooth" onPress={onBluetoothPress}>
          <StatusBadge status={bluetoothStatus} />
        </IconCircleButton>
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
