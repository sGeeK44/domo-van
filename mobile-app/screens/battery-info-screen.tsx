import { useTranslation } from "react-i18next";
import { batteryInfoCards } from "@/components/battery-settings/battery-info-view";
import { moduleAccent } from "@/components/module-accent";
import type { Observable } from "@/core/observable";
import { useObservable } from "@/core/react/useObservable";
import {
  AccentCard,
  FieldReadout,
  FieldRow,
  useThemeColor,
} from "@/design-system";
import {
  type BatterySnapshot,
  DEFAULT_BATTERY_SNAPSHOT,
} from "@/domain/battery/BatteryTelemetry";
import { SettingsFormScreen } from "@/screens/settings-form-screen";

export default function BatteryInfoScreen() {
  return (
    <SettingsFormScreen
      moduleKey="battery"
      crumbKey="battery.info.crumb"
      titleKey="battery.info.title"
      introKey="battery.info.intro"
      noteKey="battery.info.note"
    >
      {(system) => <BatteryInfoCards telemetry={system} />}
    </SettingsFormScreen>
  );
}

export type BatteryInfoCardsProps = {
  telemetry: Observable<BatterySnapshot>;
};

/** Read-only by construction: the BMS publishes, the app displays. */
export function BatteryInfoCards({ telemetry }: BatteryInfoCardsProps) {
  const { t } = useTranslation();
  const colors = useThemeColor();
  const battery = useObservable(telemetry, DEFAULT_BATTERY_SNAPSHOT);

  return (
    <>
      {batteryInfoCards(battery).map((card) => (
        <AccentCard
          key={card.labelKey}
          testID={`card-${card.labelKey}`}
          accent={moduleAccent(colors, "battery")}
          label={t(card.labelKey)}
        >
          <FieldRow>
            {card.readouts.map((readout) => (
              <FieldReadout
                key={readout.labelKey}
                testID={`readout-${readout.labelKey}`}
                label={t(readout.labelKey)}
                value={readout.value}
                unit={readout.unit}
              />
            ))}
          </FieldRow>
        </AccentCard>
      ))}
    </>
  );
}
