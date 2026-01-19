import { StyleSheet, View } from "react-native";
import { PageTitle } from "@/design-system/atoms/page-title";
import { IconCircleButton } from "@/design-system/atoms/icon-circle-button";
import { StatusBadge } from "@/design-system/atoms/status-badge";
import { Spacing } from "@/design-system/theme";

export type PageHeaderProps = {
  title: string;
  onSettingsPress: () => void;
  isLoading?: boolean;
  isConnected?: boolean;
};

export function PageHeader({
  title,
  onSettingsPress,
  isLoading = false,
  isConnected = false,
}: PageHeaderProps) {
  const connectionStatus = isLoading
    ? "loading"
    : isConnected
      ? "connected"
      : "disconnected";

  return (
    <View style={styles.header}>
      <PageTitle>{title}</PageTitle>
      <IconCircleButton icon="settings" onPress={onSettingsPress}>
        <StatusBadge status={connectionStatus} />
      </IconCircleButton>
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
});
