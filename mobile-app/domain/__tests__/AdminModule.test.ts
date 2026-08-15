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

  it("saves name and pin as one form, on one channel", async () => {
    const { channel, admin } = adminOnFake();

    const outcome = await admin.saveIdentity({
      name: "Van",
      pin: VALID_PIN,
    });

    expect(outcome).toEqual({ status: "applied" });
    expect(channel.commands).toEqual(["NAME:Van", `PIN:${VALID_PIN}`]);
  });

  it("names the refused field and still writes the other one", async () => {
    const { channel, admin } = adminOnFake();

    const outcome = await admin.saveIdentity({
      name: "Van",
      pin: TOO_SHORT_PIN,
    });

    expect(outcome).toEqual({
      status: "failed",
      failures: [
        {
          field: "water.identity.pin",
          outcome: { status: "rejected", code: "ERR_PIN_LEN" },
        },
      ],
    });
    expect(channel.commands).toContain("NAME:Van");
  });

  it("names the fields of the module it belongs to", async () => {
    const { admin } = adminOnFake("heater");

    const outcome = await admin.saveIdentity({
      name: "Van",
      pin: TOO_SHORT_PIN,
    });

    expect(outcome).toMatchObject({
      failures: [{ field: "heater.identity.pin" }],
    });
  });

  it("reports a save nothing answered, so the screen never claims success", async () => {
    const admin = new AdminModule(DEAF_CHANNEL, "water");

    const outcome = await admin.saveIdentity({ name: "Van", pin: VALID_PIN });

    expect(outcome).toEqual({
      status: "failed",
      failures: [
        { field: "water.identity.name", outcome: { status: "timedOut" } },
        { field: "water.identity.pin", outcome: { status: "timedOut" } },
      ],
    });
  });
});
