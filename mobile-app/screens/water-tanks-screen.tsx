import { useTranslation } from "react-i18next";
import {
  moduleHasTheLastWord,
  type SaveCopy,
  saveMessage,
  savePress,
} from "@/components/settings/save-report";
import { TankAndValveCards } from "@/components/water-settings/TankAndValveCards";
import {
  type TankAndValveDraft,
  tankAndValveConfig,
  tankAndValveErrors,
} from "@/components/water-settings/tank-form";
import { useWaterSystem } from "@/composition/ModuleSystemsProvider";
import { useObservable } from "@/core/react/useObservable";
import { useToast } from "@/design-system";
import type {
  SaveFailure,
  SaveFieldKey,
  SaveOutcome,
} from "@/domain/SaveOutcome";
import { DEFAULT_VALVE_STATE } from "@/domain/water/DrainValve";
import { DEFAULT_TANK_SNAPSHOT } from "@/domain/water/TankLevelSensor";
import type { WaterSystem } from "@/domain/water/WaterSystem";
import type { TranslationKey } from "@/i18n/keys";
import {
  type SettingsForm,
  useSettingsForm,
} from "@/screens/hooks/useSettingsForm";
import { SettingsFormScreen } from "@/screens/settings-form-screen";

const FIELD_NAME: Partial<Record<SaveFieldKey, TranslationKey>> = {
  "water.cleanTank": "settings.save.fields.cleanTank",
  "water.greyTank": "settings.save.fields.greyTank",
  "water.valve": "settings.save.fields.valve",
};

const SAVE_COPY: SaveCopy = {
  applied: "settings.save.sent",
  fieldName: (failure: SaveFailure) =>
    FIELD_NAME[failure.field] ?? "water.tanks.title",
};

export default function WaterTanksScreen() {
  const { t } = useTranslation();
  const toast = useToast();
  const form = useTankAndValveForm(useWaterSystem(), (outcome) =>
    toast.show(saveMessage(outcome, SAVE_COPY, t)),
  );

  return (
    <SettingsFormScreen
      moduleKey="water"
      crumbKey="water.tanks.crumb"
      titleKey="water.tanks.title"
      introKey="water.tanks.intro"
      noteKey="water.tanks.note"
      save={savePress(form, () => toast.show(t("common.errors.send")))}
    >
      {() => (
        <TankAndValveCards
          values={form.values}
          errors={form.errors}
          onChange={form.set}
        />
      )}
    </SettingsFormScreen>
  );
}

/** Five fields over three channels, saved as one action and reported as one sentence. */
function useTankAndValveForm(
  system: WaterSystem | null,
  announce: (outcome: SaveOutcome) => void,
): SettingsForm<TankAndValveDraft> {
  const clean = useObservable(system?.cleanTank ?? null, DEFAULT_TANK_SNAPSHOT);
  const grey = useObservable(system?.greyTank ?? null, DEFAULT_TANK_SNAPSHOT);
  const valve = useObservable(
    system?.greyDrainValve ?? null,
    DEFAULT_VALVE_STATE,
  );

  return useSettingsForm<TankAndValveDraft>({
    reported: {
      cleanVolume: String(clean.capacityLiters),
      cleanHeight: String(clean.heightMm),
      greyVolume: String(grey.capacityLiters),
      greyHeight: String(grey.heightMm),
      autoCloseSeconds: String(valve.autoCloseSeconds),
    },
    validate: tankAndValveErrors,
    // The outcome is what is announced: save() resolves the same whether it wrote or refused to.
    onSave: async (values) => {
      if (!system) return false;
      const outcome = await system.saveTankAndValveConfig(
        tankAndValveConfig(values),
      );
      announce(outcome);
      return moduleHasTheLastWord(outcome);
    },
  });
}
