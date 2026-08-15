import { describe, expect, it } from "vitest";
import { AdminModule } from "@/domain/AdminModule";
import type { IdentityOwner } from "@/domain/SaveOutcome";
import { FakeChannel } from "@/infrastructure/fake/FakeChannel";
import { adminScenario } from "@/infrastructure/fake/scenarios/adminScenario";

const DOWN = new Error("No BLE session is bound to this transport.");

const DEAF_CHANNEL = {
  listen: () => () => {},
  send: () => Promise.reject(DOWN),
};

const VALID_PIN = "123456";
const TOO_SHORT_PIN = "1234";

function adminOnFake(owner: IdentityOwner = "water") {
  const channel = new FakeChannel(adminScenario());
  return { channel, admin: new AdminModule(channel, owner) };
}

describe("AdminModule", () => {
  it("writes the new name on its channel and settles on the module's OK", async () => {
    const { channel, admin } = adminOnFake();

    await expect(admin.setName("Van")).resolves.toEqual({ status: "applied" });
    expect(channel.commands).toEqual(["NAME:Van"]);
  });

  it("writes the new pin on its channel and settles on the module's OK", async () => {
    const { channel, admin } = adminOnFake();

    await expect(admin.setPin(VALID_PIN)).resolves.toEqual({
      status: "applied",
    });
    expect(channel.commands).toEqual([`PIN:${VALID_PIN}`]);
  });

  it("reports the code the module refused a pin with", async () => {
    const { admin } = adminOnFake();

    await expect(admin.setPin(TOO_SHORT_PIN)).resolves.toEqual({
      status: "rejected",
      code: "ERR_PIN_LEN",
    });
  });

  it("saves name and pin as the one command the module reboots on", async () => {
    const { channel, admin } = adminOnFake();

    const outcome = await admin.saveIdentity({
      name: "Van",
      pin: VALID_PIN,
    });

    expect(outcome).toEqual({ status: "applied" });
    expect(channel.commands).toEqual([`ID:NAME=Van;PIN=${VALID_PIN}`]);
  });

  it("keeps a refused identity out of the module, whole", async () => {
    const { channel, admin } = adminOnFake();

    const outcome = await admin.saveIdentity({
      name: "Van",
      pin: TOO_SHORT_PIN,
    });

    expect(outcome).toEqual({
      status: "failed",
      failures: [
        {
          field: "water.identity",
          outcome: { status: "rejected", code: "ERR_PIN_LEN" },
        },
      ],
    });
    expect(channel.commands).toEqual([`ID:NAME=Van;PIN=${TOO_SHORT_PIN}`]);
  });

  it("names the field of the module it belongs to", async () => {
    const { admin } = adminOnFake("heater");

    const outcome = await admin.saveIdentity({
      name: "Van",
      pin: TOO_SHORT_PIN,
    });

    expect(outcome).toMatchObject({ failures: [{ field: "heater.identity" }] });
  });

  it("reports a module that does not know the identity command as a refusal", async () => {
    const channel = new FakeChannel(() => ["ERR_UNKNOWN_CMD"]);
    const admin = new AdminModule(channel, "water");

    const outcome = await admin.saveIdentity({ name: "Van", pin: VALID_PIN });

    expect(outcome).toMatchObject({
      failures: [
        {
          field: "water.identity",
          outcome: { status: "rejected", code: "ERR_UNKNOWN_CMD" },
        },
      ],
    });
    expect(channel.commands).toEqual([`ID:NAME=Van;PIN=${VALID_PIN}`]);
  });

  it("reports a save that never left the phone, and says so to the user", async () => {
    const admin = new AdminModule(DEAF_CHANNEL, "water");

    const outcome = await admin.saveIdentity({ name: "Van", pin: VALID_PIN });

    expect(outcome).toEqual({
      status: "failed",
      failures: [
        { field: "water.identity", outcome: { status: "unreachable" } },
      ],
    });
    expect(admin.getValue().lastFeedback).toEqual({
      key: "common.feedback.unreachable",
    });
  });
});
