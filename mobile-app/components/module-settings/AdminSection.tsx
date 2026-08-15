import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, ToastAndroid, View } from "react-native";
import { FormField, Spacing } from "@/design-system";
import type { AdminModule } from "@/domain/AdminModule";
import type { TranslationKey } from "@/i18n/keys";

const showToast = (message: string) => {
  ToastAndroid.show(message, ToastAndroid.SHORT);
};

function validateAdminName(name: string): TranslationKey | null {
  const trimmed = name.trim();
  if (trimmed.length < 1 || trimmed.length > 20) {
    return "modules.admin.nameLength";
  }
  if (!/^[A-Za-z0-9 _-]+$/.test(trimmed)) {
    return "modules.admin.nameCharset";
  }
  return null;
}

function validatePin(pin: string): TranslationKey | null {
  if (!/^\d{6}$/.test(pin)) {
    return "modules.admin.pinDigits";
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
  const { t } = useTranslation();
  const [adminName, setAdminName] = useState("");
  const [adminPin, setAdminPin] = useState("");
  const [sendingName, setSendingName] = useState(false);
  const [sendingPin, setSendingPin] = useState(false);

  useEffect(() => {
    setAdminName(deviceName ?? "");
  }, [deviceName]);

  useEffect(() => {
    const sub = adminModule.subscribe(({ success, lastFeedback }) => {
      if (success) {
        showToast(t("modules.admin.restarted"));
        return;
      }
      if (lastFeedback) showToast(t(lastFeedback.key, lastFeedback.params));
    });

    return () => {
      sub();
    };
  }, [adminModule, t]);

  const handleSaveName = async () => {
    const err = validateAdminName(adminName);
    if (err) {
      showToast(t(err));
      return;
    }
    setSendingName(true);
    showToast(t("modules.admin.sendingName"));
    await adminModule.setName(adminName.trim());
    setSendingName(false);
  };

  const handleSavePin = async () => {
    const err = validatePin(adminPin);
    if (err) {
      showToast(t(err));
      return;
    }
    setSendingPin(true);
    showToast(t("modules.admin.sendingPin"));
    await adminModule.setPin(adminPin);
    setSendingPin(false);
  };

  return (
    <View style={styles.adminSection}>
      <FormField
        label={t("modules.admin.section")}
        value={adminName}
        onChangeText={setAdminName}
        placeholder={t("modules.admin.namePlaceholder")}
        buttonLabel={t("modules.admin.saveName")}
        onButtonPress={handleSaveName}
        loading={sendingName}
        inputProps={{ autoCapitalize: "words" }}
      />

      <FormField
        label={t("modules.admin.pinLabel")}
        value={adminPin}
        onChangeText={setAdminPin}
        placeholder="123456"
        buttonLabel={t("modules.admin.savePin")}
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
