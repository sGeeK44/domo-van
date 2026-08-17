import { useTranslation } from "react-i18next";
import { ZONE_NAME_KEYS } from "@/components/heater/zone-names";
import {
  GAINS,
  gainKey,
  type PidFormValues,
  pidSaveMessage,
  pidValuesFrom,
  validatePidValues,
  ZONE_INDEXES,
  type ZoneIndex,
  zoneGainsFrom,
} from "@/components/heater-settings/pid-form-view";
import { moduleAccent } from "@/components/module-accent";
import {
  moduleHasTheLastWord,
  savePress,
} from "@/components/settings/save-report";
import { useModuleSystem } from "@/composition/ModuleSystemsProvider";
import { useObservable } from "@/core/react/useObservable";
import {
  AccentCard,
  FieldInput,
  FieldRow,
  useThemeColor,
  useToast,
} from "@/design-system";
import type { HeaterSystem } from "@/domain/heater/HeaterSystem";
import {
  DEFAULT_ZONE_SNAPSHOT,
  type HeaterZoneSnapshot,
} from "@/domain/heater/HeaterZone";
import type { SaveOutcome } from "@/domain/SaveOutcome";
import {
  type SettingsForm,
  useSettingsForm,
} from "@/screens/hooks/useSettingsForm";
import { SettingsFormScreen } from "@/screens/settings-form-screen";

export default function HeaterPidScreen() {
  const { t } = useTranslation();
  const toast = useToast();
  const form = usePidForm(useModuleSystem("heater"), (outcome) => {
    const message = pidSaveMessage(outcome);
    toast.show(
      t(message.key, {
        zone: message.zone ? t(message.zone) : "",
        code: message.code ?? "",
      }),
    );
  });

  return (
    <SettingsFormScreen
      moduleKey="heater"
      crumbKey="heater.pid.crumb"
      titleKey="heater.pid.title"
      introKey="heater.pid.intro"
      save={savePress(form, () => toast.show(t("common.errors.send")))}
    >
      {() => <PidCards form={form} />}
    </SettingsFormScreen>
  );
}

function usePidForm(
  heater: HeaterSystem | null,
  announce: (outcome: SaveOutcome) => void,
): SettingsForm<PidFormValues> {
  return useSettingsForm<PidFormValues>({
    reported: pidValuesFrom(useZoneSnapshots(heater)),
    validate: validatePidValues,
    // The outcome is what is announced: save() resolves the same whether it wrote or refused to.
    onSave: async (values) => {
      if (!heater) return false;
      const outcome = await heater.savePidConfig(zoneGainsFrom(values));
      announce(outcome);
      return moduleHasTheLastWord(outcome);
    },
  });
}

/** Four zones, four subscriptions — the count is fixed by the module, so the hooks are too. */
function useZoneSnapshots(
  heater: HeaterSystem | null,
): readonly HeaterZoneSnapshot[] {
  return [
    useObservable(heater?.zones[0] ?? null, DEFAULT_ZONE_SNAPSHOT),
    useObservable(heater?.zones[1] ?? null, DEFAULT_ZONE_SNAPSHOT),
    useObservable(heater?.zones[2] ?? null, DEFAULT_ZONE_SNAPSHOT),
    useObservable(heater?.zones[3] ?? null, DEFAULT_ZONE_SNAPSHOT),
  ];
}

function PidCards({ form }: { form: SettingsForm<PidFormValues> }) {
  const { t } = useTranslation();
  const colors = useThemeColor();

  return (
    <>
      {ZONE_INDEXES.map((zone) => (
        <AccentCard
          key={ZONE_NAME_KEYS[zone]}
          testID={`pid-zone-${zone}`}
          accent={moduleAccent(colors, "heater")}
          // The mockup sets the zone name in caps; the dictionary carries it as a name.
          label={t("heater.pid.card", {
            zone: t(ZONE_NAME_KEYS[zone]).toUpperCase(),
          })}
        >
          <FieldRow>
            {GAINS.map((gain) => (
              <GainField key={gain} form={form} zone={zone} gain={gain} />
            ))}
          </FieldRow>
        </AccentCard>
      ))}
    </>
  );
}

type GainFieldProps = {
  form: SettingsForm<PidFormValues>;
  zone: ZoneIndex;
  gain: (typeof GAINS)[number];
};

function GainField({ form, zone, gain }: GainFieldProps) {
  const key = gainKey(zone, gain);

  return (
    <FieldInput
      testID={`pid-${key}`}
      // Kp / Ki / Kd are symbols, not copy — they read the same in every language.
      label={`K${gain.slice(1)}`}
      value={form.values[key]}
      onChangeText={(text) => form.set(key, text)}
      invalid={form.errors[key] !== undefined}
      inputProps={{ keyboardType: "decimal-pad" }}
    />
  );
}
