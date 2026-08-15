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
  savePress,
} from "@/components/water-settings/save-report";
import { useModuleSlot } from "@/composition/ModuleRegistryProvider";
import { useWaterSystem } from "@/composition/ModuleSystemsProvider";
import { useThemeColor, useToast } from "@/design-system";
import type { SaveOutcome } from "@/domain/SaveOutcome";
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
  const { t } = useTranslation();
  const toast = useToast();
  const colors = useThemeColor();
  const pairedName = useModuleSlot("water").pairing?.name ?? "";
  const form = useIdentityForm(useWaterSystem(), pairedName, (outcome) =>
    toast.show(saveMessage(outcome, SAVE_COPY, t)),
  );

  return (
    <SettingsFormScreen
      moduleKey="water"
      crumbKey="water.identity.crumb"
      titleKey="water.identity.title"
      introKey="water.identity.intro"
      save={savePress(form, () => toast.show(t("common.errors.send")))}
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
  announce: (outcome: SaveOutcome) => void,
): SettingsForm<IdentityDraft> {
  return useSettingsForm<IdentityDraft>({
    reported: { name: pairedName, pin: NO_PIN },
    validate: identityErrors,
    // The outcome is what is announced: save() resolves the same whether it wrote or refused to.
    onSave: async (values) => {
      if (!system) return;
      announce(await system.admin.saveIdentity(moduleIdentity(values)));
    },
  });
}
