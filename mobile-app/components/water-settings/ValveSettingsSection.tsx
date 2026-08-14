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
import type { DrainValve } from "@/domain/water/DrainValve";

function validatePositiveInt(label: string, value: string): string | null {
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed))
    return `${label} doit être un nombre entier positif.`;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n <= 0) return `${label} doit être > 0.`;
  if (n > 300) return `${label} doit être ≤ 300 secondes.`;
  return null;
}

type Props = {
  valve: DrainValve;
};

const showToast = (message: string) => {
  ToastAndroid.show(message, ToastAndroid.SHORT);
};

export function ValveSettingsSection({ valve }: Props) {
  const colors = useThemeColor();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [autoCloseSeconds, setAutoCloseSeconds] = useState("");
  const requestConfig = useMemo(() => {
    return async () => {
      try {
        await valve.getConfig();
      } catch (e) {
        const msg =
          e instanceof Error ? e.message : "Erreur lors de la lecture.";
        showToast(msg);
      }
    };
  }, [valve]);

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
          <Text style={styles.label}>Vanne de Vidange</Text>
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
          placeholder="Durée (secondes)"
          placeholderTextColor={colors.textMuted}
          keyboardType="number-pad"
          style={styles.input}
        />

        <Pressable
          onPress={async () => {
            const err = validatePositiveInt("Durée", autoCloseSeconds);
            if (err) {
              showToast(err);
              return;
            }
            showToast("Envoi configuration…");
            try {
              await valve.setAutoCloseTime(Number(autoCloseSeconds.trim()));
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
