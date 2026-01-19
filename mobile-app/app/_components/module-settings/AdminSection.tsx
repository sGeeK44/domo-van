import { useEffect, useState } from "react";
import { Pressable, Text, TextInput, ToastAndroid, View } from "react-native";
import type { ModuleSettingsStyles } from "@/app/_components/module-settings/styles";
import type { AdminModule } from "@/domain/AdminModule";

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
  styles: ModuleSettingsStyles;
  adminModule: AdminModule;
  deviceName: string | null;
};

/**
 * Generic admin section for module settings.
 * Works with any module that has an AdminModule instance.
 */
export function AdminSection({ styles, adminModule, deviceName }: Props) {
  const [adminName, setAdminName] = useState("");
  const [adminPin, setAdminPin] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    setAdminName(deviceName ?? "");
  }, [deviceName]);

  useEffect(() => {
    const sub = adminModule.subscribe((msg) => {
      if (msg.success) {
        showToast("OK. Le module va redémarrer. Reconnecte-toi.");
      } else if (msg.error) {
        showToast(`Erreur: ${msg.error}`);
      }
    });

    return () => {
      sub();
    };
  }, [adminModule]);

  return (
    <View style={styles.adminSection}>
      <View style={styles.field}>
        <Text style={[styles.label, { marginBottom: 8 }]}>Administration</Text>
        <TextInput
          value={adminName}
          onChangeText={setAdminName}
          placeholder="Nom du module"
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
              await adminModule.setName(adminName.trim());
            } catch (e) {
              showToast(
                e instanceof Error ? e.message : "Erreur lors de l'envoi.",
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
              await adminModule.setPin(adminPin);
            } catch (e) {
              showToast(
                e instanceof Error ? e.message : "Erreur lors de l'envoi.",
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
