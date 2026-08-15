import { describe, expect, it } from "vitest";
import {
  identityFieldName,
  type SaveCopy,
  saveMessage,
  saveReport,
} from "@/components/water-settings/save-report";
import type { SaveOutcome, WriteOutcome } from "@/domain/SaveOutcome";
import type { TranslationKey } from "@/i18n/keys";

const TANKS: SaveCopy = {
  applied: "water.save.sent",
  fieldName: () => "water.save.fields.cleanTank",
};

const IDENTITY: SaveCopy = {
  applied: "modules.admin.restarted",
  fieldName: identityFieldName,
};

function failed(outcome: WriteOutcome): SaveOutcome {
  return {
    status: "failed",
    failures: [{ field: "water.cleanTank", outcome }],
  };
}

function refusedIdentity(code: string): SaveOutcome {
  return {
    status: "failed",
    failures: [
      { field: "water.identity", outcome: { status: "rejected", code } },
    ],
  };
}

describe("what a save is announced as", () => {
  it("confirms the form's own applied copy", () => {
    expect(saveReport({ status: "applied" }, TANKS)).toEqual({
      key: "water.save.sent",
    });
    expect(saveReport({ status: "applied" }, IDENTITY)).toEqual({
      key: "modules.admin.restarted",
    });
  });

  it.each([
    [{ status: "rejected", code: "ERR_CFG_RANGE" }, "water.save.refused"],
    [{ status: "timedOut" }, "water.save.notConfirmed"],
    [{ status: "unreachable" }, "water.save.unreachable"],
  ] as const)("tells %o apart from the others", (outcome, key) => {
    expect(saveReport(failed(outcome), TANKS)).toEqual({
      key,
      fieldKey: "water.save.fields.cleanTank",
    });
  });

  it("names the first failure, the one the user reads", () => {
    const outcome: SaveOutcome = {
      status: "failed",
      failures: [
        { field: "water.greyTank", outcome: { status: "timedOut" } },
        { field: "water.valve", outcome: { status: "unreachable" } },
      ],
    };

    expect(saveReport(outcome, TANKS).key).toBe("water.save.notConfirmed");
  });
});

// Name and PIN travel as one command, so the code is the only thing that tells them apart.
describe("the field a refused identity names", () => {
  it.each([
    ["ERR_NAME_LEN", "water.save.fields.name"],
    ["ERR_NAME_CHARS", "water.save.fields.name"],
    ["ERR_PIN_LEN", "water.save.fields.pin"],
    ["ERR_PIN_NUM", "water.save.fields.pin"],
  ])("reads %s as %s", (code, fieldKey) => {
    expect(saveReport(refusedIdentity(code), IDENTITY).fieldKey).toBe(fieldKey);
  });

  it("names the whole frame when the module refuses its format", () => {
    expect(saveReport(refusedIdentity("ERR_ID_FMT"), IDENTITY).fieldKey).toBe(
      "water.save.fields.identity",
    );
  });

  it("names the whole identity when nothing was refused at all", () => {
    expect(
      identityFieldName({
        field: "water.identity",
        outcome: { status: "unreachable" },
      }),
    ).toBe("water.save.fields.identity");
  });
});

describe("the sentence the toast shows", () => {
  const shout = ((key: TranslationKey, params?: { field: string }) =>
    params ? `${key}(${params.field})` : key) as (
    key: TranslationKey,
    params?: { field: string },
  ) => string;

  it("carries no field on the applied copy", () => {
    expect(saveMessage({ status: "applied" }, TANKS, shout)).toBe(
      "water.save.sent",
    );
  });

  it("puts the translated field name inside the failure copy", () => {
    expect(saveMessage(failed({ status: "timedOut" }), TANKS, shout)).toBe(
      "water.save.notConfirmed(water.save.fields.cleanTank)",
    );
  });
});
