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
import { useHeaterSystem } from "@/composition/ModuleSystemsProvider";
import { useThemeColor, useToast } from "@/design-system";
import type { HeaterSystem } from "@/domain/heater/HeaterSystem";
import type { SaveOutcome } from "@/domain/SaveOutcome";
import {
  type ReportedName,
  useReportedName,
} from "@/screens/hooks/useReportedName";
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

export default function HeaterIdentityScreen() {
  const { t } = useTranslation();
  const toast = useToast();
  const colors = useThemeColor();
  const form = useIdentityForm(
    useHeaterSystem(),
    useReportedName("heater"),
    (outcome) => toast.show(saveMessage(outcome, SAVE_COPY, t)),
  );

  return (
    <SettingsFormScreen
      moduleKey="heater"
      crumbKey="heater.identity.crumb"
      titleKey="heater.identity.title"
      introKey="heater.identity.intro"
      save={savePress(form, {
        onFailure: () => toast.show(t("common.errors.send")),
        onBlocked: () => toast.show(t("settings.save.blocked")),
      })}
    >
      {() => (
        <IdentityCards
          accent={moduleAccent(colors, "heater")}
          values={form.values}
          errors={form.errors}
          onChange={form.set}
        />
      )}
    </SettingsFormScreen>
  );
}

function useIdentityForm(
  system: HeaterSystem | null,
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
