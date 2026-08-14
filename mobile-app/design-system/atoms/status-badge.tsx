import { StyleSheet, View } from "react-native";
import { useThemeColor } from "@/design-system/theme/use-theme-color";

export type StatusBadgeProps = {
  status: "connected" | "partial" | "disconnected" | "loading";
  size?: number;
};

/**
 * One view for every status, never a subtree that comes and goes: a link
 * settles in under a frame, and Fabric merges a create with the delete that
 * follows it, which strands the created view outside the tree.
 */
export function StatusBadge({ status, size = 10 }: StatusBadgeProps) {
  const colors = useThemeColor();
  const statusColor = {
    connected: colors.success,
    partial: colors.textMuted,
    disconnected: colors.danger,
    loading: colors.textMuted,
  }[status];

  return (
    <View
      style={[
        styles.badge,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: statusColor,
          borderColor: colors.surface,
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  badge: {
    position: "absolute",
    top: 6,
    right: 6,
    borderWidth: 2,
  },
});
