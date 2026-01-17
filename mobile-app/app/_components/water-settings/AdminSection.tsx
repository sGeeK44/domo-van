import type { WaterSettingsStyles } from "@/app/_components/water-settings/styles";
import { WaterSystem } from "@/domain/water/WaterSystem";
import { useEffect, useState } from "react";
import { Pressable, Text, TextInput, ToastAndroid, View } from "react-native";
import { Device } from "react-native-ble-plx";

const showToast = (message: string) => {
  ToastAndroid.show(message, ToastAndroid.SHORT);
};

function validateAdminName(name: string): string | null {
  const trimmed = name.trim();
  if (trimmed.length < 1 || trimmed.length > 20) {
    return "Le nom doit faire entre 1 et 20 caractères.";
  }
  if (!/^[A-Za-z0-9 _-]+$/.test(trimmed)) {
    return "Caractères autorisés: A-Z, 0-9, espace, - et _.";
  }
  return null;
}

function validatePin(pin: string): string | null {
  if (!/^\d{6}$/.test(pin)) {
    return "Le PIN doit contenir exactement 6 chiffres.";
  }
  return null;
}

type Props = {
  styles: WaterSettingsStyles;
  connectedDevice: Device;
};

export function AdminSection({ styles, connectedDevice }: Props) {
  const [adminName, setAdminName] = useState("");
  const [adminPin, setAdminPin] = useState("");
  const [sending, setSending] = useState(false);
  const waterSystem = new WaterSystem(connectedDevice);

  useEffect(() => {
    setAdminName(connectedDevice.name ?? "");
  }, [connectedDevice.name]);

  useEffect(() => {
    const sub = waterSystem.admin.subscribe((msg) => {
      if (msg.success) {
        showToast("OK. Le module va redémarrer. Reconnecte-toi.");
      } else {
        showToast(`Erreur: ${msg.error}`);
      }
    });

    return () => {
      sub();
    };
  }, [waterSystem.admin]);

  return (
    <View style={styles.adminSection}>
      <View style={styles.field}>
        <Text style={[styles.label, { marginBottom: 8 }]}>Administration</Text>
        <TextInput
          value={adminName}
          onChangeText={setAdminName}
          placeholder="Water Tank"
          placeholderTextColor="rgba(255,255,255,0.45)"
          autoCapitalize="words"
          style={styles.input}
        />
        <Pressable
          onPress={async () => {
            const err = validateAdminName(adminName);
            if (err) {
              showToast(err);
              return;
            }
            setSending(true);
            showToast("Envoi du nouveau nom…");
            try {
              await waterSystem.admin.setName(adminName.trim());
            } catch (e) {
              showToast(
                e instanceof Error ? e.message : "Erreur lors de l'envoi."
              );
            } finally {
              setSending(false);
            }
          }}
          style={[styles.primaryButton, sending && { opacity: 0.6 }]}
          disabled={sending}
        >
          <Text style={styles.primaryButtonText}>Enregistrer le nom</Text>
        </Pressable>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>PIN (6 chiffres)</Text>
        <TextInput
          value={adminPin}
          onChangeText={setAdminPin}
          placeholder="123456"
          placeholderTextColor="rgba(255,255,255,0.45)"
          keyboardType="number-pad"
          secureTextEntry
          style={styles.input}
          maxLength={6}
        />
        <Pressable
          onPress={async () => {
            const err = validatePin(adminPin);
            if (err) {
              showToast(err);
              return;
            }
            setSending(true);
            showToast("Envoi du nouveau PIN…");
            try {
              await waterSystem.admin.setPin(adminPin);
            } catch (e) {
              showToast(
                e instanceof Error ? e.message : "Erreur lors de l'envoi."
              );
            } finally {
              setSending(false);
            }
          }}
          style={[styles.primaryButton, sending && { opacity: 0.6 }]}
          disabled={sending}
        >
          <Text style={styles.primaryButtonText}>Enregistrer le PIN</Text>
        </Pressable>
      </View>
    </View>
  );
}
