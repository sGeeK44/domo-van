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
import { errorMessage } from "@/components/error-message";
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
import type { TankLevelSensor } from "@/domain/water/TankLevelSensor";
import type { TranslationKey } from "@/i18n/keys";

function validatePositiveInt(value: string): TranslationKey | null {
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) return "water.settings.positiveInteger";
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n <= 0) return "water.settings.greaterThanZero";
  return null;
}

type Props = {
  tank: TankLevelSensor;
  label: string;
};

const showToast = (message: string) => {
  ToastAndroid.show(message, ToastAndroid.SHORT);
};

export function TankSettingsSection({ tank, label }: Props) {
  const { t } = useTranslation();
  const colors = useThemeColor();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [volumeLiters, setVolumeLiters] = useState("");
  const [heightMm, setHeightMm] = useState("");
  const requestAllCfg = useMemo(() => {
    return async () => {
      try {
        await tank.getConfig();
      } catch (e) {
        showToast(errorMessage(e, t, "common.errors.read"));
      }
    };
  }, [tank, t]);

  useEffect(() => {
    const sub = tank.subscribe((snapshot) => {
      setVolumeLiters(String(snapshot.capacityLiters));
      setHeightMm(String(snapshot.heightMm));
      if (snapshot.lastFeedback) {
        const { key, params } = snapshot.lastFeedback;
        showToast(t(key, params));
      }
    });

    void requestAllCfg();

    return () => {
      sub();
    };
  }, [tank, requestAllCfg, t]);

  return (
    <View style={styles.adminSection}>
      <View style={styles.field}>
        <View style={styles.fieldHeader}>
          <Text style={styles.label}>
            {t("water.settings.tankSection", { tank: label })}
          </Text>
          <Pressable
            onPress={() => void requestAllCfg()}
            style={styles.refreshButton}
            hitSlop={8}
          >
            <IconSymbol name="refresh" size={18} color={colors.textMuted} />
          </Pressable>
        </View>

        <TextInput
          value={volumeLiters}
          onChangeText={setVolumeLiters}
          placeholder={t("water.settings.volumePlaceholder")}
          placeholderTextColor={colors.textMuted}
          keyboardType="number-pad"
          style={styles.input}
        />

        <TextInput
          value={heightMm}
          onChangeText={setHeightMm}
          placeholder={t("water.settings.heightPlaceholder")}
          placeholderTextColor={colors.textMuted}
          keyboardType="number-pad"
          style={styles.input}
        />

        <Pressable
          onPress={async () => {
            const vErr = validatePositiveInt(volumeLiters);
            const hErr = validatePositiveInt(heightMm);
            if (vErr) {
              showToast(t(vErr, { field: t("water.settings.volume") }));
              return;
            }
            if (hErr) {
              showToast(t(hErr, { field: t("water.settings.height") }));
              return;
            }
            showToast(t("water.settings.sending"));
            try {
              await tank.setConfig(volumeLiters.trim(), heightMm.trim());
            } catch (e) {
              showToast(errorMessage(e, t, "common.errors.send"));
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
