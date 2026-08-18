import Constants from "expo-constants";
import { useRouter } from "expo-router";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLanguage } from "@/composition/LanguageProvider";
import {
  type Palette,
  SegmentedControl,
  SettingsHeader,
  Spacing,
  TextStyles,
  type ThemeMode,
  useStyles,
  useTheme,
} from "@/design-system";
import type { Language } from "@/i18n/language";
import { ModuleSettingsSection } from "@/screens/module-settings-section";

const LANGUAGES: readonly Language[] = ["fr", "en"];
const THEME_MODES: readonly ThemeMode[] = ["auto", "dark", "light"];

export default function SettingsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const styles = useStyles(makeStyles);

  const { language, setLanguage } = useLanguage();
  const { themeMode, setThemeMode } = useTheme();

  const version = Constants.expoConfig?.version;

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
        {/* Closing pops back to Bord: Réglages is the root of its stack, not a step in it. */}
        <SettingsHeader
          title={t("settings.title")}
          variant="close"
          onBackPress={() => router.back()}
        />

        <ScrollView contentContainerStyle={styles.body}>
          <Group label={t("settings.groups.modules")}>
            <ModuleSettingsSection />
          </Group>

          <Group label={t("settings.groups.application")}>
            <SegmentedControl
              label={t("settings.language.label")}
              options={LANGUAGES.map((value) => ({
                value,
                label: t(`settings.language.${value}`),
              }))}
              value={language}
              onChange={setLanguage}
            />
            <SegmentedControl
              label={t("settings.theme.label")}
              options={THEME_MODES.map((value) => ({
                value,
                label: t(`settings.theme.${value}`),
              }))}
              value={themeMode}
              onChange={setThemeMode}
            />
          </Group>

          {version && (
            <Text testID="settings-version" style={styles.footer}>
              {t("settings.version", { version })}
            </Text>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function Group({ label, children }: { label: string; children: ReactNode }) {
  const styles = useStyles(makeStyles);

  return (
    <View style={styles.group}>
      <Text style={styles.groupLabel}>{label}</Text>
      <View style={styles.rows}>{children}</View>
    </View>
  );
}

/** The mockup's 22 px between groups, which lands on no spacing step. */
const GROUP_GAP = 22;

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.screen,
    },
    safeArea: {
      flex: 1,
    },
    body: {
      flexGrow: 1,
      gap: GROUP_GAP,
      paddingTop: Spacing.m,
      paddingHorizontal: Spacing.gutter,
    },
    group: {
      gap: Spacing.m,
    },
    groupLabel: {
      ...TextStyles.sectionLabel,
      color: colors.textMuted,
    },
    rows: {
      gap: Spacing.s,
    },
    footer: {
      ...TextStyles.monoSmall,
      marginTop: "auto",
      paddingBottom: Spacing.gutter,
      color: colors.textMuted,
    },
  });
