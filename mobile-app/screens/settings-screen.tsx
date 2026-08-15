import Constants from "expo-constants";
import { useRouter } from "expo-router";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  moduleSettingsRows,
  slotSummary,
} from "@/components/settings/settings-rows";
import { useLanguage } from "@/composition/LanguageProvider";
import { useModuleSlots } from "@/composition/ModuleRegistryProvider";
import {
  NavRow,
  type Palette,
  SegmentedControl,
  SettingsHeader,
  Spacing,
  TextStyles,
  type ThemeMode,
  useStyles,
  useTheme,
  useThemeColor,
} from "@/design-system";
import type { ModuleKey } from "@/domain/modules/ModuleDescriptor";
import type { Language } from "@/i18n/language";

const MODULES_ROUTE = "/modules";

/** Réglages reaches the same three forms the module tabs' tune chip does. */
const FORM_ROUTE = {
  water: "/settings/water-tanks",
  heater: "/settings/heater-pid",
  battery: "/settings/battery-info",
} as const satisfies Record<ModuleKey, string>;

const LANGUAGES: readonly Language[] = ["fr", "en"];
const THEME_MODES: readonly ThemeMode[] = ["auto", "dark", "light"];

export default function SettingsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const colors = useThemeColor();
  const styles = useStyles(makeStyles);

  const { language, setLanguage } = useLanguage();
  const { themeMode, setThemeMode } = useTheme();

  const slots = useModuleSlots();
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
            <NavRow
              testID="settings-row-modules"
              icon="memory"
              iconBackground={colors.chip}
              title={t("settings.rows.modules")}
              subtitle={t("settings.rows.modulesSubtitle", slotSummary(slots))}
              onPress={() => router.push(MODULES_ROUTE)}
            />
            {moduleSettingsRows(slots, colors).map((row) => (
              <NavRow
                key={row.moduleKey}
                testID={`settings-row-${row.moduleKey}`}
                icon={row.icon}
                iconBackground={row.iconBackground}
                title={t(row.titleKey)}
                subtitle={t(row.subtitleKey)}
                dimmed={row.dimmed}
                onPress={() => router.push(FORM_ROUTE[row.moduleKey])}
              />
            ))}
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
