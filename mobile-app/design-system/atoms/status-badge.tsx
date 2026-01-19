import { ActivityIndicator, StyleSheet, View } from "react-native";

export type StatusBadgeProps = {
  status: "connected" | "partial" | "disconnected" | "loading";
  size?: number;
};

const STATUS_COLORS = {
  connected: "#2ECC71",
  partial: "#F39C12",
  disconnected: "#E74C3C",
};

export function StatusBadge({ status, size = 10 }: StatusBadgeProps) {
  if (status === "loading") {
    return (
      <View style={[styles.container, { width: size, height: size }]}>
        <ActivityIndicator size={size} color="#FFFFFF" />
      </View>
    );
  }

  return (
    <View
      style={[
        styles.badge,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: STATUS_COLORS[status],
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 6,
    right: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  badge: {
    position: "absolute",
    top: 6,
    right: 6,
    borderWidth: 2,
    borderColor: "rgba(0, 0, 0, 0.25)",
  },
});
