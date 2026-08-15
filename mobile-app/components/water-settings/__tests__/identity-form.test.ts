import { describe, expect, it } from "vitest";
import {
  type IdentityDraft,
  identityErrors,
  moduleIdentity,
} from "@/components/water-settings/identity-form";

const VALID: IdentityDraft = { name: "Cuve avant", pin: "123456" };

function errorsWith(overrides: Partial<IdentityDraft>) {
  return identityErrors({ ...VALID, ...overrides });
}

describe("the identity validation", () => {
  it("passes a name and a six-digit PIN", () => {
    expect(identityErrors(VALID)).toEqual({});
  });

  it.each([
    "",
    " ",
    "a".repeat(21),
  ])("refuses %s, which is outside the 1 to 20 characters the firmware stores", (name) => {
    expect(errorsWith({ name })).toEqual({
      name: "modules.admin.nameLength",
    });
  });

  it.each([
    "Eau#1",
    "Réservoir",
    "a\tb",
  ])("refuses %s, whose characters the firmware does not accept", (name) => {
    expect(errorsWith({ name })).toEqual({
      name: "modules.admin.nameCharset",
    });
  });

  it.each(["A-Z_0", "eau 1", "a".repeat(20)])("accepts %s", (name) => {
    expect(errorsWith({ name })).toEqual({});
  });

  it.each([
    "12345",
    "1234567",
    "12345a",
    "",
  ])("refuses %s, which is not exactly six digits", (pin) => {
    expect(errorsWith({ pin })).toEqual({
      pin: "modules.admin.pinDigits",
    });
  });
});

describe("the identity a draft becomes", () => {
  it("sends the name without the spacing the user typed around it", () => {
    expect(moduleIdentity({ name: "  Cuve  ", pin: "123456" })).toEqual({
      name: "Cuve",
      pin: "123456",
    });
  });
});
