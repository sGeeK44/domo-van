import { useTranslation } from "react-i18next";
import { moduleAccent } from "@/components/module-accent";
import { IdentityCards } from "@/components/water-settings/IdentityCards";
import {
  type IdentityDraft,
  identityErrors,
  moduleIdentity,
} from "@/components/water-settings/identity-form";
import {
  identityFieldName,
  type SaveCopy,
  saveMessage,
} from "@/components/water-settings/save-report";
import { useModuleSlot } from "@/composition/ModuleRegistryProvider";
import { useWaterSystem } from "@/composition/ModuleSystemsProvider";
import { useThemeColor, useToast } from "@/design-system";
import type { WaterSystem } from "@/domain/water/WaterSystem";
import {
  type SettingsForm,
  useSettingsForm,
} from "@/screens/hooks/useSettingsForm";
import { SettingsFormScreen } from "@/screens/settings-form-screen";

/** The module reboots on the ack, so what a save confirms is the restart. */
const SAVE_COPY: SaveCopy = {
  applied: "modules.admin.restarted",
  fieldName: identityFieldName,
};

/** The PIN is write-only: the module never reports it, so an untouched form has none to show. */
const NO_PIN = "";

export default function WaterIdentityScreen() {
  const colors = useThemeColor();
  const pairedName = useModuleSlot("water").pairing?.name ?? "";
  const form = useIdentityForm(useWaterSystem(), pairedName);

  return (
    <SettingsFormScreen
      moduleKey="water"
      crumbKey="water.identity.crumb"
      titleKey="water.identity.title"
      introKey="water.identity.intro"
      save={{ onPress: () => void form.save(), busy: form.saving }}
    >
      {() => (
        <IdentityCards
          accent={moduleAccent(colors, "water")}
          values={form.values}
          errors={form.dirty ? form.errors : {}}
          onChange={form.set}
        />
      )}
    </SettingsFormScreen>
  );
}

function useIdentityForm(
  system: WaterSystem | null,
  pairedName: string,
): SettingsForm<IdentityDraft> {
  const { t } = useTranslation();
  const toast = useToast();

  return useSettingsForm<IdentityDraft>({
    reported: { name: pairedName, pin: NO_PIN },
    validate: identityErrors,
    // The outcome is what is announced: save() resolves the same whether it wrote or refused to.
    onSave: async (values) => {
      if (!system) return;
      const outcome = await system.admin.saveIdentity(moduleIdentity(values));
      toast.show(saveMessage(outcome, SAVE_COPY, t));
    },
  });
}
