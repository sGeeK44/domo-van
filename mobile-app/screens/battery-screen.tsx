import { useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  FontSize,
  PageHeader,
  Spacing,
  type ThemeColors,
  useThemeColor,
} from "@/design-system";

/** Placeholder: the tab has to exist before a later issue fills it. */
export default function BatteryScreen() {
  const colors = useThemeColor();
  const styles = getStyles(colors);
  const router = useRouter();

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <PageHeader
          title="Batterie"
          onSettingsPress={() => router.push("/battery-settings")}
        />
        <View style={styles.content}>
          <Text style={styles.text}>Écran batterie à venir.</Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const getStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background.primary,
    },
    safeArea: {
      flex: 1,
    },
    content: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: Spacing.xxxl,
    },
    text: {
      color: colors.text.secondary,
      fontSize: FontSize.m,
    },
  });
