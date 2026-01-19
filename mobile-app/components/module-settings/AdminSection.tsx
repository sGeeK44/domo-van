import { useEffect, useState } from "react";
import { StyleSheet, ToastAndroid, View } from "react-native";
import { Spacing } from "@/design-system";
import { FormField } from "@/design-system/molecules/form-field";
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
  adminModule: AdminModule;
  deviceName: string | null;
};

/**
 * Generic admin section for module settings.
 * Works with any module that has an AdminModule instance.
 */
export function AdminSection({ adminModule, deviceName }: Props) {
  const [adminName, setAdminName] = useState("");
  const [adminPin, setAdminPin] = useState("");
  const [sendingName, setSendingName] = useState(false);
  const [sendingPin, setSendingPin] = useState(false);

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

  const handleSaveName = async () => {
    const err = validateAdminName(adminName);
    if (err) {
      showToast(err);
      return;
    }
    setSendingName(true);
    showToast("Envoi du nouveau nom…");
    try {
      await adminModule.setName(adminName.trim());
    } catch (e) {
      showToast(
        e instanceof Error ? e.message : "Erreur lors de l'envoi.",
      );
    } finally {
      setSendingName(false);
    }
  };

  const handleSavePin = async () => {
    const err = validatePin(adminPin);
    if (err) {
      showToast(err);
      return;
    }
    setSendingPin(true);
    showToast("Envoi du nouveau PIN…");
    try {
      await adminModule.setPin(adminPin);
    } catch (e) {
      showToast(
        e instanceof Error ? e.message : "Erreur lors de l'envoi.",
      );
    } finally {
      setSendingPin(false);
    }
  };

  return (
    <View style={styles.adminSection}>
      <FormField
        label="Administration"
        value={adminName}
        onChangeText={setAdminName}
        placeholder="Nom du module"
        buttonLabel="Enregistrer le nom"
        onButtonPress={handleSaveName}
        loading={sendingName}
        inputProps={{ autoCapitalize: "words" }}
      />

      <FormField
        label="PIN (6 chiffres)"
        value={adminPin}
        onChangeText={setAdminPin}
        placeholder="123456"
        buttonLabel="Enregistrer le PIN"
        onButtonPress={handleSavePin}
        loading={sendingPin}
        inputProps={{
          keyboardType: "number-pad",
          secureTextEntry: true,
          maxLength: 6,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  adminSection: {
    paddingHorizontal: Spacing.xxl,
    paddingBottom: Spacing.l,
    gap: Spacing.l,
  },
});
