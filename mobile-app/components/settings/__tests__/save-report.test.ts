import { describe, expect, it, vi } from "vitest";
import {
  identityFieldName,
  type SaveCopy,
  saveMessage,
  savePress,
  saveReport,
} from "@/components/settings/save-report";
import type { SaveOutcome, WriteOutcome } from "@/domain/SaveOutcome";
import type { TranslationKey } from "@/i18n/keys";

const TANKS: SaveCopy = {
  applied: "settings.save.sent",
  fieldName: () => "settings.save.fields.cleanTank",
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
      key: "settings.save.sent",
    });
    expect(saveReport({ status: "applied" }, IDENTITY)).toEqual({
      key: "modules.admin.restarted",
    });
  });

  it.each([
    [{ status: "rejected", code: "ERR_CFG_RANGE" }, "settings.save.refused"],
    [{ status: "timedOut" }, "settings.save.notConfirmed"],
    [{ status: "unreachable" }, "settings.save.unreachable"],
  ] as const)("tells %o apart from the others", (outcome, key) => {
    expect(saveReport(failed(outcome), TANKS)).toEqual({
      key,
      fieldKey: "settings.save.fields.cleanTank",
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

    expect(saveReport(outcome, TANKS).key).toBe("settings.save.notConfirmed");
  });
});

// Name and PIN travel as one command, so the code is the only thing that tells them apart.
describe("the field a refused identity names", () => {
  it.each([
    ["ERR_NAME_LEN", "settings.save.fields.name"],
    ["ERR_NAME_CHARS", "settings.save.fields.name"],
    ["ERR_PIN_LEN", "settings.save.fields.pin"],
    ["ERR_PIN_NUM", "settings.save.fields.pin"],
  ])("reads %s as %s", (code, fieldKey) => {
    expect(saveReport(refusedIdentity(code), IDENTITY).fieldKey).toBe(fieldKey);
  });

  it("names the whole frame when the module refuses its format", () => {
    expect(saveReport(refusedIdentity("ERR_ID_FMT"), IDENTITY).fieldKey).toBe(
      "settings.save.fields.identity",
    );
  });

  it("names the whole identity when nothing was refused at all", () => {
    expect(
      identityFieldName({
        field: "water.identity",
        outcome: { status: "unreachable" },
      }),
    ).toBe("settings.save.fields.identity");
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
      "settings.save.sent",
    );
  });

  it("puts the translated field name inside the failure copy", () => {
    expect(saveMessage(failed({ status: "timedOut" }), TANKS, shout)).toBe(
      "settings.save.notConfirmed(settings.save.fields.cleanTank)",
    );
  });

  it("names every field that failed, not only the first", () => {
    const outcome = {
      status: "failed",
      failures: [
        { field: "water.cleanTank", outcome: { status: "timedOut" } },
        { field: "water.greyTank", outcome: { status: "timedOut" } },
      ],
    } as const;

    const bothTanks: SaveCopy = {
      applied: "settings.save.sent",
      fieldName: (failure) =>
        failure.field === "water.cleanTank"
          ? "settings.save.fields.cleanTank"
          : "settings.save.fields.greyTank",
    };

    expect(saveMessage(outcome, bothTanks, shout)).toBe(
      "settings.save.notConfirmed(settings.save.fields.cleanTank, settings.save.fields.greyTank)",
    );
  });
});

describe("the press behind the save button", () => {
  it("carries the form's own busy flag", () => {
    const press = savePress(
      { save: async () => {}, saving: true, blocked: false },
      { onFailure: () => {}, onBlocked: () => {} },
    );

    expect(press.busy).toBe(true);
  });

  // useSettingsForm rethrows what the write threw, and a dropped throw would say nothing.
  it("reports a save that threw rather than letting it escape", async () => {
    const onFailure = vi.fn();
    const save = () => Promise.reject(new Error("the radio went away"));

    savePress(
      { save, saving: false, blocked: false },
      { onFailure, onBlocked: () => {} },
    ).onPress();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(onFailure).toHaveBeenCalledTimes(1);
  });

  // A press that validation refuses still has to say why; doing nothing reads as a dead button.
  it("says why a press validation refuses reached no module", () => {
    const onBlocked = vi.fn();

    savePress(
      { save: async () => {}, saving: false, blocked: true },
      { onFailure: () => {}, onBlocked },
    ).onPress();

    expect(onBlocked).toHaveBeenCalledTimes(1);
  });
});
