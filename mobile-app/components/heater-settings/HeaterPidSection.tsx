import { useCallback, useEffect, useMemo, useState } from "react";
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
import type { PidConfig } from "@/domain/heater/HeaterProtocol";
import type { HeaterZone } from "@/domain/heater/HeaterZone";
import type { TranslationKey } from "@/i18n/keys";

const showToast = (message: string) => {
  ToastAndroid.show(message, ToastAndroid.SHORT);
};

function validatePidValue(value: string): TranslationKey | null {
  const trimmed = value.trim();
  if (!/^\d+(\.\d+)?$/.test(trimmed)) {
    return "heater.settings.positiveNumber";
  }
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n < 0.01 || n > 100) {
    return "heater.settings.range";
  }
  return null;
}

type Props = {
  heaterZone: HeaterZone;
  zoneName: string;
};

export function HeaterPidSection({ heaterZone, zoneName }: Props) {
  const { t } = useTranslation();
  const colors = useThemeColor();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [kp, setKp] = useState("");
  const [ki, setKi] = useState("");
  const [kd, setKd] = useState("");
  const [sending, setSending] = useState(false);

  const requestConfig = useCallback(async () => {
    try {
      await heaterZone.getPidConfig();
    } catch (e) {
      const msg = e instanceof Error ? e.message : t("common.errors.read");
      showToast(msg);
    }
  }, [heaterZone, t]);

  useEffect(() => {
    const sub = heaterZone.subscribe((snapshot) => {
      if (snapshot.pidConfig) {
        setKp(snapshot.pidConfig.kp.toFixed(2));
        setKi(snapshot.pidConfig.ki.toFixed(2));
        setKd(snapshot.pidConfig.kd.toFixed(2));
      }
      if (snapshot.lastMessage) {
        showToast(snapshot.lastMessage);
      }
    });

    void requestConfig();

    return () => {
      sub();
    };
  }, [heaterZone, requestConfig]);

  const gainError = (field: string, value: string): string | null => {
    const error = validatePidValue(value);
    return error ? t(error, { field }) : null;
  };

  const handleSave = async () => {
    const invalid =
      gainError("Kp", kp) ?? gainError("Ki", ki) ?? gainError("Kd", kd);

    if (invalid) {
      showToast(invalid);
      return;
    }

    setSending(true);
    showToast(t("heater.settings.sendingPid"));

    try {
      const config: PidConfig = {
        kp: Number(kp.trim()),
        ki: Number(ki.trim()),
        kd: Number(kd.trim()),
      };
      await heaterZone.setPidConfig(config);
    } catch (e) {
      showToast(e instanceof Error ? e.message : t("common.errors.send"));
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={styles.adminSection}>
      <View style={styles.field}>
        <View style={styles.fieldHeader}>
          <Text style={styles.label}>
            {t("heater.settings.pidSection", { zone: zoneName })}
          </Text>
          <Pressable
            onPress={() => void requestConfig()}
            style={styles.refreshButton}
            hitSlop={8}
          >
            <IconSymbol name="refresh" size={18} color={colors.textMuted} />
          </Pressable>
        </View>

        <View style={{ gap: Spacing.s }}>
          <View style={styles.pidRow}>
            <Text style={[styles.label, styles.pidLabel]}>Kp</Text>
            <TextInput
              value={kp}
              onChangeText={setKp}
              placeholder="10.00"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
              style={[styles.input, { flex: 1 }]}
            />
          </View>

          <View style={styles.pidRow}>
            <Text style={[styles.label, styles.pidLabel]}>Ki</Text>
            <TextInput
              value={ki}
              onChangeText={setKi}
              placeholder="0.10"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
              style={[styles.input, { flex: 1 }]}
            />
          </View>

          <View style={styles.pidRow}>
            <Text style={[styles.label, styles.pidLabel]}>Kd</Text>
            <TextInput
              value={kd}
              onChangeText={setKd}
              placeholder="0.50"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
              style={[styles.input, { flex: 1 }]}
            />
          </View>
        </View>

        <Pressable
          onPress={handleSave}
          style={[styles.primaryButton, sending && { opacity: Opacity.subtle }]}
          disabled={sending}
        >
          <Text style={styles.primaryButtonText}>
            {t("heater.settings.savePid")}
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
    pidRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: Spacing.s,
    },
    pidLabel: {
      width: 30,
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
