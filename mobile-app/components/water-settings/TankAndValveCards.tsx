import { useTranslation } from "react-i18next";
import type {
  TankAndValveDraft,
  TankAndValveErrors,
} from "@/components/water-settings/tank-form";
import {
  AccentCard,
  FieldInput,
  FieldRow,
  useThemeColor,
} from "@/design-system";

const LITERS = "L";
const MILLIMETERS = "mm";
const SECONDS = "s";

const WHOLE_NUMBER = { keyboardType: "number-pad" } as const;

export type TankAndValveCardsProps = {
  values: TankAndValveDraft;
  errors: TankAndValveErrors;
  onChange: <K extends keyof TankAndValveDraft>(key: K, value: string) => void;
};

export function TankAndValveCards({
  values,
  errors,
  onChange,
}: TankAndValveCardsProps) {
  const { t } = useTranslation();
  const colors = useThemeColor();

  return (
    <>
      <AccentCard
        testID="card-clean-tank"
        accent={colors.fill.cleanWater}
        label={t("water.tanks.cleanTank")}
      >
        <FieldRow>
          <FieldInput
            testID="clean-volume"
            label={t("water.tanks.volume")}
            unit={LITERS}
            value={values.cleanVolume}
            invalid={Boolean(errors.cleanVolume)}
            onChangeText={(text) => onChange("cleanVolume", text)}
            inputProps={WHOLE_NUMBER}
          />
          <FieldInput
            testID="clean-height"
            label={t("water.tanks.emptyHeight")}
            unit={MILLIMETERS}
            value={values.cleanHeight}
            invalid={Boolean(errors.cleanHeight)}
            onChangeText={(text) => onChange("cleanHeight", text)}
            inputProps={WHOLE_NUMBER}
          />
        </FieldRow>
      </AccentCard>

      <AccentCard
        testID="card-grey-tank"
        accent={colors.fill.greyWater}
        label={t("water.tanks.greyTank")}
      >
        <FieldRow>
          <FieldInput
            testID="grey-volume"
            label={t("water.tanks.volume")}
            unit={LITERS}
            value={values.greyVolume}
            invalid={Boolean(errors.greyVolume)}
            onChangeText={(text) => onChange("greyVolume", text)}
            inputProps={WHOLE_NUMBER}
          />
          <FieldInput
            testID="grey-height"
            label={t("water.tanks.emptyHeight")}
            unit={MILLIMETERS}
            value={values.greyHeight}
            invalid={Boolean(errors.greyHeight)}
            onChangeText={(text) => onChange("greyHeight", text)}
            inputProps={WHOLE_NUMBER}
          />
        </FieldRow>
      </AccentCard>

      <AccentCard
        testID="card-valve"
        accent={colors.fill.cleanWater}
        label={t("water.tanks.valve")}
      >
        <FieldRow>
          <FieldInput
            testID="auto-close"
            label={t("water.tanks.autoClose")}
            unit={SECONDS}
            value={values.autoCloseSeconds}
            invalid={Boolean(errors.autoCloseSeconds)}
            onChangeText={(text) => onChange("autoCloseSeconds", text)}
            inputProps={WHOLE_NUMBER}
          />
        </FieldRow>
      </AccentCard>
    </>
  );
}
