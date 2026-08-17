import { useState } from "react";
import { useTranslation } from "react-i18next";
import { moduleAccent } from "@/components/module-accent";
import { IdentityCards } from "@/components/settings/IdentityCards";
import {
  type IdentityDraft,
  identityErrors,
  moduleIdentity,
} from "@/components/settings/identity-form";
import {
  identityFieldName,
  moduleHasTheLastWord,
  type SaveCopy,
  saveMessage,
  savePress,
} from "@/components/settings/save-report";
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
  const form = useIdentityForm(
    useWaterSystem(),
    useReportedName("water"),
    (outcome) => toast.show(saveMessage(outcome, SAVE_COPY, t)),
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
          errors={form.errors}
          onChange={form.set}
        />
      )}
    </SettingsFormScreen>
  );
}

type ReportedName = { value: string; keep: (name: string) => void };

/**
 * The name the module answers to. A slot's `pairing` is written once, at pairing time, and no
 * reconnection refreshes it — so a name we saw the module accept is newer than the one it carries.
 */
function useReportedName(moduleKey: "water"): ReportedName {
  const paired = useModuleSlot(moduleKey).pairing?.name ?? "";
  const [written, setWritten] = useState<string | null>(null);

  return { value: written ?? paired, keep: setWritten };
}

function useIdentityForm(
  system: WaterSystem | null,
  name: ReportedName,
  announce: (outcome: SaveOutcome) => void,
): SettingsForm<IdentityDraft> {
  return useSettingsForm<IdentityDraft>({
    reported: { name: name.value, pin: NO_PIN },
    validate: identityErrors,
    // The outcome is what is announced: save() resolves the same whether it wrote or refused to.
    onSave: async (values) => {
      if (!system) return false;
      const identity = moduleIdentity(values);
      const outcome = await system.admin.saveIdentity(identity);
      if (outcome.status === "applied") name.keep(identity.name);
      announce(outcome);
      return moduleHasTheLastWord(outcome);
    },
  });
}
