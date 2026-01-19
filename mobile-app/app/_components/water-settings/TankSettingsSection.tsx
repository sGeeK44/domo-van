import type { ModuleSettingsStyles } from "@/app/_components/module-settings/styles";
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
  return null;
}

type Props = {
  styles: ModuleSettingsStyles;
  connectedDevice: Device;
  name: string;
};

const showToast = (message: string) => {
  ToastAndroid.show(message, ToastAndroid.SHORT);
};

export function TankSettingsSection({ styles, connectedDevice, name }: Props) {
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
  }, [tankSettings]);

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
              color="rgba(255,255,255,0.7)"
            />
          </Pressable>
        </View>

        <TextInput
          value={volumeLiters}
          onChangeText={setVolumeLiters}
          placeholder="Volume (L)"
          placeholderTextColor="rgba(255,255,255,0.45)"
          keyboardType="number-pad"
          style={styles.input}
        />

        <TextInput
          value={heightMm}
          onChangeText={setHeightMm}
          placeholder="Hauteur vide (mm)"
          placeholderTextColor="rgba(255,255,255,0.45)"
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
