import { Colors } from "@/design-system";
import { StyleSheet } from "react-native";

export type WaterSettingsStyles = ReturnType<typeof getWaterSettingsStyles>;

export const getWaterSettingsStyles = (
  colors: typeof Colors.light | typeof Colors.dark,
) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background.primary,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 12,
    },
    title: {
      color: "#FFFFFF",
      fontSize: 20,
      fontWeight: "800",
    },
    section: {
      paddingHorizontal: 16,
      paddingBottom: 12,
      gap: 8,
    },
    status: {
      color: "#FFFFFF",
      fontSize: 14,
      opacity: 0.9,
    },
    error: {
      color: "#FF6B6B",
      fontSize: 12,
    },
    info: {
      color: "rgba(255,255,255,0.85)",
      fontSize: 12,
    },
    actionsRow: {
      flexDirection: "row",
      gap: 10,
    },
    primaryButton: {
      backgroundColor: colors.primary["500"],
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 12,
    },
    primaryButtonText: {
      color: "#000000",
      fontWeight: "800",
    },
    secondaryButton: {
      borderColor: "rgba(255,255,255,0.2)",
      borderWidth: 1,
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 12,
    },
    secondaryButtonText: {
      color: "#FFFFFF",
      fontWeight: "700",
    },
    listHeader: {
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 6,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    listTitle: {
      color: "#FFFFFF",
      fontSize: 14,
      fontWeight: "800",
      opacity: 0.9,
    },
    scanningPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: 999,
      backgroundColor: "rgba(255,255,255,0.12)",
    },
    scanningText: {
      color: "#FFFFFF",
      fontSize: 12,
      opacity: 0.9,
    },
    listContent: {
      paddingHorizontal: 16,
      paddingBottom: 16,
      gap: 10,
    },
    adminSection: {
      paddingHorizontal: 16,
      paddingBottom: 12,
      gap: 12,
    },
    field: {
      gap: 8,
      padding: 12,
      borderRadius: 14,
      backgroundColor: "rgba(255,255,255,0.06)",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.08)",
    },
    label: {
      color: "#FFFFFF",
      fontSize: 12,
      opacity: 0.85,
      fontWeight: "800",
    },
    input: {
      color: "#FFFFFF",
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.18)",
      backgroundColor: "rgba(0,0,0,0.15)",
    },
    ack: {
      color: "rgba(255,255,255,0.75)",
      fontSize: 12,
    },
    deviceRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderRadius: 14,
      backgroundColor: "rgba(255,255,255,0.08)",
    },
    deviceName: {
      color: "#FFFFFF",
      fontSize: 16,
      fontWeight: "800",
    },
    deviceId: {
      color: "#FFFFFF",
      fontSize: 12,
      opacity: 0.6,
    },
    bottomButtonContainer: {
      marginTop: "auto",
      paddingHorizontal: 16,
      paddingBottom: 16,
    },
    fieldHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 8,
    },
    refreshButton: {
      padding: 4,
    },
  });
