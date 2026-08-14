import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text } from "react-native";
import { FontSize, type Palette, Spacing, useStyles } from "@/design-system";

/** The only way to reach the gallery on a device, and `__DEV__` keeps it out of a shipped build. */
export function GaugeGalleryLink() {
  const router = useRouter();
  const styles = useStyles(makeStyles);

  if (!__DEV__) return null;

  return (
    <Pressable
      testID="gauge-gallery-link"
      onPress={() => router.push("/gauge-gallery")}
    >
      <Text style={styles.label}>Dev · Gauge gallery</Text>
    </Pressable>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    label: {
      color: colors.textMuted,
      fontSize: FontSize.xs,
      paddingVertical: Spacing.m,
      textAlign: "center",
    },
  });
