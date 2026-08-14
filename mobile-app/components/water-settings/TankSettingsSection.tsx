import { useEffect, useMemo, useState } from "react";
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
import type { TankLevelSensor } from "@/domain/water/TankLevelSensor";

function validatePositiveInt(label: string, value: string): string | null {
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed))
    return `${label} doit être un nombre entier positif.`;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n <= 0) return `${label} doit être > 0.`;
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
  const colors = useThemeColor();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [volumeLiters, setVolumeLiters] = useState("");
  const [heightMm, setHeightMm] = useState("");
  const requestAllCfg = useMemo(() => {
    return async () => {
      try {
        await tank.getConfig();
      } catch (e) {
        const msg =
          e instanceof Error ? e.message : "Erreur lors de la lecture.";
        showToast(msg);
      }
    };
  }, [tank]);

  useEffect(() => {
    const sub = tank.subscribe((snapshot) => {
      setVolumeLiters(String(snapshot.capacityLiters));
      setHeightMm(String(snapshot.heightMm));
      if (snapshot.lastMessage) {
        showToast(snapshot.lastMessage);
      }
    });

    void requestAllCfg();

    return () => {
      sub();
    };
  }, [tank, requestAllCfg]);

  return (
    <View style={styles.adminSection}>
      <View style={styles.field}>
        <View style={styles.fieldHeader}>
          <Text style={styles.label}>Réservoir ({label})</Text>
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
          placeholder="Volume (L)"
          placeholderTextColor={colors.textMuted}
          keyboardType="number-pad"
          style={styles.input}
        />

        <TextInput
          value={heightMm}
          onChangeText={setHeightMm}
          placeholder="Hauteur vide (mm)"
          placeholderTextColor={colors.textMuted}
          keyboardType="number-pad"
          style={styles.input}
        />

        <Pressable
          onPress={async () => {
            const vErr = validatePositiveInt("Volume", volumeLiters);
            const hErr = validatePositiveInt("Hauteur", heightMm);
            if (vErr || hErr) {
              showToast(vErr ?? hErr ?? "Erreur de validation");
              return;
            }
            showToast("Envoi configuration…");
            try {
              await tank.setConfig(volumeLiters.trim(), heightMm.trim());
            } catch (e) {
              showToast(
                e instanceof Error ? e.message : "Erreur lors de l'envoi.",
              );
            }
          }}
          style={styles.primaryButton}
        >
          <Text style={styles.primaryButtonText}>Enregistrer</Text>
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
