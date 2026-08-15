import { useTranslation } from "react-i18next";
import type {
  IdentityDraft,
  IdentityErrors,
} from "@/components/water-settings/identity-form";
import { AccentCard, FieldInput, FieldRow } from "@/design-system";

const PIN_LENGTH = 6;

const NAME_INPUT = { autoCapitalize: "words" } as const;
const PIN_INPUT = {
  keyboardType: "number-pad",
  secureTextEntry: true,
  maxLength: PIN_LENGTH,
} as const;

export type IdentityCardsProps = {
  accent: string;
  values: IdentityDraft;
  errors: IdentityErrors;
  onChange: <K extends keyof IdentityDraft>(key: K, value: string) => void;
};

/** Both modules share this form; only the accent tells the water one from the heater one. */
export function IdentityCards({
  accent,
  values,
  errors,
  onChange,
}: IdentityCardsProps) {
  const { t } = useTranslation();

  return (
    <>
      <AccentCard
        testID="card-name"
        accent={accent}
        label={t("water.identity.nameCard")}
      >
        <FieldRow>
          <FieldInput
            testID="module-name"
            label={t("water.identity.name")}
            value={values.name}
            invalid={Boolean(errors.name)}
            onChangeText={(text) => onChange("name", text)}
            inputProps={NAME_INPUT}
          />
        </FieldRow>
      </AccentCard>

      <AccentCard
        testID="card-pin"
        accent={accent}
        label={t("water.identity.pinCard")}
      >
        <FieldRow>
          <FieldInput
            testID="module-pin"
            label={t("water.identity.pin")}
            value={values.pin}
            invalid={Boolean(errors.pin)}
            onChangeText={(text) => onChange("pin", text)}
            inputProps={PIN_INPUT}
          />
        </FieldRow>
      </AccentCard>
    </>
  );
}
