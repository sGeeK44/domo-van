import { ActivityIndicator, StyleSheet, View } from "react-native";
import { SectionTitle } from "@/design-system/atoms/section-title";
import { BorderRadius, Opacity, Spacing, TextColors } from "@/design-system/theme";

export type SectionProps = {
  title: string;
  isScanning?: boolean;
  children: React.ReactNode;
};

export function Section({ title, isScanning, children }: SectionProps) {
  return (
    <>
      <View style={styles.header}>
        <SectionTitle>{title}</SectionTitle>
        {isScanning && (
          <View style={styles.scanningPill}>
            <ActivityIndicator size="small" color={TextColors.primary} />
          </View>
        )}
      </View>
      <View style={styles.content}>{children}</View>
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.s,
    paddingBottom: Spacing.xs,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  scanningPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.s,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.m,
    borderRadius: BorderRadius.pill,
    backgroundColor: `rgba(255,255,255,${Opacity.muted})`,
  },
  content: {
    paddingHorizontal: Spacing.xxl,
    paddingBottom: Spacing.xxl,
    gap: Spacing.m,
  },
});
