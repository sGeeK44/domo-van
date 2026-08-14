import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  FontSize,
  PageHeader,
  type Palette,
  Spacing,
  useThemeColor,
} from "@/design-system";

/** Placeholder: the tab has to exist before a later issue fills it. */
export default function BatteryScreen() {
  const { t } = useTranslation();
  const colors = useThemeColor();
  const styles = getStyles(colors);
  const router = useRouter();

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <PageHeader
          title={t("battery.overview.title")}
          onSettingsPress={() => router.push("/battery-settings")}
        />
        <View style={styles.content}>
          <Text style={styles.text}>{t("battery.overview.placeholder")}</Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const getStyles = (colors: Palette) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.screen,
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
      color: colors.textMuted,
      fontSize: FontSize.m,
    },
  });
