import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, ToastAndroid, View } from "react-native";
import { Device } from "react-native-ble-plx";
import {
  BorderRadius,
  FontSize,
  FontWeight,
  Opacity,
  Spacing,
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
  return null;
}

type Props = {
  connectedDevice: Device;
  name: string;
};

const showToast = (message: string) => {
  ToastAndroid.show(message, ToastAndroid.SHORT);
};

export function TankSettingsSection({ connectedDevice, name }: Props) {
  const colors = useThemeColor();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [volumeLiters, setVolumeLiters] = useState("");
  const [heightMm, setHeightMm] = useState("");
  const waterSystem = useMemo(
    () => new WaterSystem(connectedDevice),
    [connectedDevice],
  );
  const tankSettings = useMemo(
    () => waterSystem.getTankSettings(name),
    [waterSystem, name],
  );

  const requestAllCfg = useMemo(() => {
    return async () => {
      try {
        await tankSettings.getConfig();
      } catch (e) {
        const msg =
          e instanceof Error ? e.message : "Erreur lors de la lecture.";
        showToast(msg);
      }
    };
  }, [tankSettings]);

  useEffect(() => {
    const sub = tankSettings.subscribe((snapshot) => {
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
  }, [tankSettings, requestAllCfg]);

  return (
    <View style={styles.adminSection}>
      <View style={styles.field}>
        <View style={styles.fieldHeader}>
          <Text style={styles.label}>
            Réservoir ({name === "clean" ? "Eau Propre" : "Eau Grise"})
          </Text>
          <Pressable
            onPress={() => void requestAllCfg()}
            style={styles.refreshButton}
            hitSlop={8}
          >
            <IconSymbol
              name="refresh"
              size={18}
              color={colors.text.secondary}
            />
          </Pressable>
        </View>

        <TextInput
          value={volumeLiters}
          onChangeText={setVolumeLiters}
          placeholder="Volume (L)"
          placeholderTextColor={colors.text.secondary}
          keyboardType="number-pad"
          style={styles.input}
        />

        <TextInput
          value={heightMm}
          onChangeText={setHeightMm}
          placeholder="Hauteur vide (mm)"
          placeholderTextColor={colors.text.secondary}
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
              await tankSettings.setConfig(
                volumeLiters.trim(),
                heightMm.trim(),
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
      backgroundColor: colors.background.secondary,
      borderWidth: 1,
      borderColor: colors.neutral["500"],
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
      color: colors.text.primary,
      fontSize: FontSize.xs,
      opacity: Opacity.medium,
      fontWeight: `${FontWeight.extraBold}`,
    },
    input: {
      color: colors.text.primary,
      paddingVertical: Spacing.m,
      paddingHorizontal: Spacing.l,
      borderRadius: BorderRadius.s,
      borderWidth: 1,
      borderColor: colors.neutral["600"],
      backgroundColor: colors.background.primary,
    },
    primaryButton: {
      backgroundColor: colors.primary["500"],
      paddingVertical: Spacing.m,
      paddingHorizontal: Spacing.xl,
      borderRadius: BorderRadius.s,
    },
    primaryButtonText: {
      color: colors.text.inverse,
      fontWeight: `${FontWeight.extraBold}`,
    },
  });
