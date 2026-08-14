import type { ComponentProps } from "react";
import { StyleSheet, View } from "react-native";
import { IconCircleButton } from "@/design-system/atoms/icon-circle-button";
import { PageTitle } from "@/design-system/atoms/page-title";
import {
  StatusBadge,
  type StatusBadgeProps,
} from "@/design-system/atoms/status-badge";
import { type ThemeMode, useTheme } from "@/design-system/theme/ThemeContext";
import { Spacing } from "@/design-system/tokens";

/** Auto stays on the ring: a two-way flip would strand the user on a fixed scheme. */
const NEXT_THEME_MODE: Record<ThemeMode, ThemeMode> = {
  auto: "light",
  light: "dark",
  dark: "auto",
};

/** The icon names the mode, not the resolved scheme, so Auto reads as Auto. */
const THEME_MODE_ICON: Record<
  ThemeMode,
  ComponentProps<typeof IconCircleButton>["icon"]
> = {
  auto: "brightness-auto",
  light: "light-mode",
  dark: "dark-mode",
};

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
  const { themeMode, setThemeMode } = useTheme();

  return (
    <View style={styles.header}>
      <PageTitle>{title}</PageTitle>
      <View style={styles.buttons}>
        <IconCircleButton
          testID="theme-mode"
          icon={THEME_MODE_ICON[themeMode]}
          onPress={() => setThemeMode(NEXT_THEME_MODE[themeMode])}
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
