import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, ToastAndroid, View } from "react-native";
import { Device } from "react-native-ble-plx";
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
import { WaterSystem } from "@/domain/water/WaterSystem";
import { useThemeColor } from "@/hooks/use-theme-color";

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
  connectedDevice: Device;
};

const showToast = (message: string) => {
  ToastAndroid.show(message, ToastAndroid.SHORT);
};

export function ValveSettingsSection({ connectedDevice }: Props) {
  const colors = useThemeColor();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [autoCloseSeconds, setAutoCloseSeconds] = useState("");
  const waterSystem = useMemo(
    () => new WaterSystem(connectedDevice),
    [connectedDevice],
  );
  const drainValve = useMemo(() => waterSystem.greyDrainValve, [waterSystem]);

  const requestConfig = useMemo(() => {
    return async () => {
      try {
        await drainValve.getConfig();
      } catch (e) {
        const msg =
          e instanceof Error ? e.message : "Erreur lors de la lecture.";
        showToast(msg);
      }
    };
  }, [drainValve]);

  useEffect(() => {
    const sub = drainValve.subscribe((snapshot) => {
      setAutoCloseSeconds(String(snapshot.autoCloseSeconds));
      if (snapshot.lastMessage) {
        showToast(snapshot.lastMessage);
      }
    });

    void requestConfig();

    return () => {
      sub();
      waterSystem.dispose();
    };
  }, [drainValve, requestConfig, waterSystem]);

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
            <IconSymbol
              name="refresh"
              size={18}
              color={`rgba(255,255,255,${Opacity.low})`}
            />
          </Pressable>
        </View>

        <TextInput
          value={autoCloseSeconds}
          onChangeText={setAutoCloseSeconds}
          placeholder="Durée (secondes)"
          placeholderTextColor={`rgba(255,255,255,${Opacity.faint})`}
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
              await drainValve.setAutoCloseTime(
                Number(autoCloseSeconds.trim()),
              );
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
