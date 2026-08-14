import { StyleSheet, View } from "react-native";
import { useThemeColor } from "@/design-system/theme/use-theme-color";

export type StatusBadgeProps = {
  status: "connected" | "partial" | "disconnected" | "loading";
  size?: number;
};

const STATUS_COLORS = {
  connected: "#2ECC71",
  partial: "#F39C12",
  disconnected: "#E74C3C",
  loading: "#F39C12",
};

/**
 * One view for every status, never a subtree that comes and goes: a link
 * settles in under a frame, and Fabric merges a create with the delete that
 * follows it, which strands the created view outside the tree.
 */
export function StatusBadge({ status, size = 10 }: StatusBadgeProps) {
  const colors = useThemeColor();

  return (
    <View
      style={[
        styles.badge,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: STATUS_COLORS[status],
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
