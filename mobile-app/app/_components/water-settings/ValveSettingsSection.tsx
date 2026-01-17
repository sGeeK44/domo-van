import type { WaterSettingsStyles } from "@/app/_components/water-settings/styles";
import { IconSymbol } from "@/design-system/atoms/icon-symbol";
import { WaterSystem } from "@/domain/water/WaterSystem";
import { useEffect, useMemo, useState } from "react";
import { Pressable, Text, TextInput, ToastAndroid, View } from "react-native";
import { Device } from "react-native-ble-plx";

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
  styles: WaterSettingsStyles;
  connectedDevice: Device;
};

const showToast = (message: string) => {
  ToastAndroid.show(message, ToastAndroid.SHORT);
};

export function ValveSettingsSection({ styles, connectedDevice }: Props) {
  const [autoCloseSeconds, setAutoCloseSeconds] = useState("");
  const waterSystem = useMemo(
    () => new WaterSystem(connectedDevice),
    [connectedDevice]
  );
  const drainValve = useMemo(
    () => waterSystem.greyDrainValve,
    [waterSystem]
  );

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
            <IconSymbol name="refresh" size={18} color="rgba(255,255,255,0.7)" />
          </Pressable>
        </View>

        <TextInput
          value={autoCloseSeconds}
          onChangeText={setAutoCloseSeconds}
          placeholder="Durée (secondes)"
          placeholderTextColor="rgba(255,255,255,0.45)"
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
              await drainValve.setAutoCloseTime(Number(autoCloseSeconds.trim()));
            } catch (e) {
              showToast(
                e instanceof Error ? e.message : "Erreur lors de l'envoi."
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
