import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, ToastAndroid, View } from "react-native";
import {
  BorderRadius,
  FontSize,
  FontWeight,
  Opacity,
  Spacing,
  TextColors,
  type ThemeColors,
} from "@/design-system";
import { IconSymbol } from "@/design-system/atoms/icon-symbol";
import type { HeaterZone, PidConfig } from "@/domain/heater/HeaterZone";
import { useThemeColor } from "@/hooks/use-theme-color";

const showToast = (message: string) => {
  ToastAndroid.show(message, ToastAndroid.SHORT);
};

function validatePidValue(label: string, value: string): string | null {
  const trimmed = value.trim();
  if (!/^\d+(\.\d+)?$/.test(trimmed)) {
    return `${label} doit etre un nombre positif.`;
  }
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n < 0.01 || n > 100) {
    return `${label} doit etre entre 0.01 et 100.`;
  }
  return null;
}

type Props = {
  heaterZone: HeaterZone;
  zoneName: string;
};

export function HeaterPidSection({ heaterZone, zoneName }: Props) {
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
      const msg = e instanceof Error ? e.message : "Erreur lors de la lecture.";
      showToast(msg);
    }
  }, [heaterZone]);

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

  const handleSave = async () => {
    const kpErr = validatePidValue("Kp", kp);
    const kiErr = validatePidValue("Ki", ki);
    const kdErr = validatePidValue("Kd", kd);

    if (kpErr || kiErr || kdErr) {
      showToast(kpErr ?? kiErr ?? kdErr ?? "Erreur de validation");
      return;
    }

    setSending(true);
    showToast("Envoi configuration PID...");

    try {
      const config: PidConfig = {
        kp: Number(kp.trim()),
        ki: Number(ki.trim()),
        kd: Number(kd.trim()),
      };
      await heaterZone.setPidConfig(config);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Erreur lors de l'envoi.");
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={styles.adminSection}>
      <View style={styles.field}>
        <View style={styles.fieldHeader}>
          <Text style={styles.label}>Configuration PID - {zoneName}</Text>
          <Pressable
            onPress={() => void requestConfig()}
            style={styles.refreshButton}
            hitSlop={8}
          >
            <IconSymbol
              name="refresh"
              size={18}
              color={`rgba(255,255,255,${Opacity.low})`}
            />
          </Pressable>
        </View>

        <View style={{ gap: Spacing.s }}>
          <View style={styles.pidRow}>
            <Text style={[styles.label, styles.pidLabel]}>Kp</Text>
            <TextInput
              value={kp}
              onChangeText={setKp}
              placeholder="10.00"
              placeholderTextColor={`rgba(255,255,255,${Opacity.faint})`}
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
              placeholderTextColor={`rgba(255,255,255,${Opacity.faint})`}
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
              placeholderTextColor={`rgba(255,255,255,${Opacity.faint})`}
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
          <Text style={styles.primaryButtonText}>Enregistrer PID</Text>
        </Pressable>
      </View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
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
      backgroundColor: `rgba(255,255,255,${Opacity.hint})`,
      borderWidth: 1,
      borderColor: `rgba(255,255,255,${Opacity.overlay})`,
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
      color: TextColors.primary,
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
      color: TextColors.primary,
      paddingVertical: Spacing.m,
      paddingHorizontal: Spacing.l,
      borderRadius: BorderRadius.s,
      borderWidth: 1,
      borderColor: `rgba(255,255,255,${Opacity.dim})`,
      backgroundColor: "rgba(0,0,0,0.15)",
    },
    primaryButton: {
      backgroundColor: colors.primary["500"],
      paddingVertical: Spacing.m,
      paddingHorizontal: Spacing.xl,
      borderRadius: BorderRadius.s,
    },
    primaryButtonText: {
      color: TextColors.dark,
      fontWeight: `${FontWeight.extraBold}`,
    },
  });
