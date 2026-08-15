import { useTranslation } from "react-i18next";
import {
  type SaveCopy,
  saveMessage,
} from "@/components/water-settings/save-report";
import { TankAndValveCards } from "@/components/water-settings/TankAndValveCards";
import {
  type TankAndValveDraft,
  tankAndValveConfig,
  tankAndValveErrors,
} from "@/components/water-settings/tank-form";
import { useWaterSystem } from "@/composition/ModuleSystemsProvider";
import { useObservable } from "@/core/react/useObservable";
import { useToast } from "@/design-system";
import type { SaveFailure, SaveFieldKey } from "@/domain/SaveOutcome";
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
  "water.cleanTank": "water.save.fields.cleanTank",
  "water.greyTank": "water.save.fields.greyTank",
  "water.valve": "water.save.fields.valve",
};

const SAVE_COPY: SaveCopy = {
  applied: "water.save.sent",
  fieldName: (failure: SaveFailure) =>
    FIELD_NAME[failure.field] ?? "water.tanks.title",
};

export default function WaterTanksScreen() {
  const form = useTankAndValveForm(useWaterSystem());

  return (
    <SettingsFormScreen
      moduleKey="water"
      crumbKey="water.tanks.crumb"
      titleKey="water.tanks.title"
      introKey="water.tanks.intro"
      noteKey="water.tanks.note"
      save={{ onPress: () => void form.save(), busy: form.saving }}
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
): SettingsForm<TankAndValveDraft> {
  const { t } = useTranslation();
  const toast = useToast();
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
      if (!system) return;
      const outcome = await system.saveTankAndValveConfig(
        tankAndValveConfig(values),
      );
      toast.show(saveMessage(outcome, SAVE_COPY, t));
    },
  });
}
