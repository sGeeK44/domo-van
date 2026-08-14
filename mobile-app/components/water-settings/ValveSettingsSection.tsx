import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  ToastAndroid,
  View,
} from "react-native";
import {
  BorderRadius,
  FontSize,
  FontWeight,
  IconSymbol,
  Opacity,
  type Palette,
  Spacing,
  useThemeColor,
} from "@/design-system";
import type { DrainValve } from "@/domain/water/DrainValve";
import type { TranslationKey } from "@/i18n/keys";

function validatePositiveInt(value: string): TranslationKey | null {
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) return "water.settings.positiveInteger";
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n <= 0) return "water.settings.greaterThanZero";
  if (n > 300) return "water.settings.atMostFiveMinutes";
  return null;
}

type Props = {
  valve: DrainValve;
};

const showToast = (message: string) => {
  ToastAndroid.show(message, ToastAndroid.SHORT);
};

export function ValveSettingsSection({ valve }: Props) {
  const { t } = useTranslation();
  const colors = useThemeColor();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [autoCloseSeconds, setAutoCloseSeconds] = useState("");
  const requestConfig = useMemo(() => {
    return async () => {
      try {
        await valve.getConfig();
      } catch (e) {
        const msg = e instanceof Error ? e.message : t("common.errors.read");
        showToast(msg);
      }
    };
  }, [valve, t]);

  useEffect(() => {
    const sub = valve.subscribe((snapshot) => {
      setAutoCloseSeconds(String(snapshot.autoCloseSeconds));
      if (snapshot.lastMessage) {
        showToast(snapshot.lastMessage);
      }
    });

    void requestConfig();

    return () => {
      sub();
    };
  }, [valve, requestConfig]);

  return (
    <View style={styles.adminSection}>
      <View style={styles.field}>
        <View style={styles.fieldHeader}>
          <Text style={styles.label}>{t("water.settings.valveSection")}</Text>
          <Pressable
            onPress={() => void requestConfig()}
            style={styles.refreshButton}
            hitSlop={8}
          >
            <IconSymbol name="refresh" size={18} color={colors.textMuted} />
          </Pressable>
        </View>

        <TextInput
          value={autoCloseSeconds}
          onChangeText={setAutoCloseSeconds}
          placeholder={t("water.settings.durationPlaceholder")}
          placeholderTextColor={colors.textMuted}
          keyboardType="number-pad"
          style={styles.input}
        />

        <Pressable
          onPress={async () => {
            const err = validatePositiveInt(autoCloseSeconds);
            if (err) {
              showToast(t(err, { field: t("water.settings.duration") }));
              return;
            }
            showToast(t("water.settings.sending"));
            try {
              await valve.setAutoCloseTime(Number(autoCloseSeconds.trim()));
            } catch (e) {
              showToast(
                e instanceof Error ? e.message : t("common.errors.send"),
              );
            }
          }}
          style={styles.primaryButton}
        >
          <Text style={styles.primaryButtonText}>
            {t("common.actions.save")}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    adminSection: {
      paddingHorizontal: Spacing.xxl,
      paddingBottom: Spacing.l,
      gap: Spacing.l,
    },
    field: {
      gap: Spacing.s,
      padding: Spacing.l,
      borderRadius: BorderRadius.m,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    fieldHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: Spacing.s,
    },
    refreshButton: {
      padding: Spacing.xxs,
    },
    label: {
      color: colors.text,
      fontSize: FontSize.xs,
      opacity: Opacity.medium,
      fontWeight: `${FontWeight.extraBold}`,
    },
    input: {
      color: colors.text,
      paddingVertical: Spacing.m,
      paddingHorizontal: Spacing.l,
      borderRadius: BorderRadius.s,
      borderWidth: 1,
      borderColor: colors.dash,
      backgroundColor: colors.screen,
    },
    primaryButton: {
      backgroundColor: colors.inverse,
      paddingVertical: Spacing.m,
      paddingHorizontal: Spacing.xl,
      borderRadius: BorderRadius.s,
    },
    primaryButtonText: {
      color: colors.onInverse,
      fontWeight: `${FontWeight.extraBold}`,
    },
  });
