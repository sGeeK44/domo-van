import { describe, expect, it } from "vitest";
import { AdminModule } from "@/domain/AdminModule";
import type { Channel } from "@/domain/ports/Channel";

const DOWN = new Error("No BLE session is bound to this transport.");

function recordingChannel(): Channel & { commands: string[] } {
  const commands: string[] = [];
  return {
    commands,
    listen: () => () => {},
    send: (command: string) => {
      commands.push(command);
      return Promise.resolve();
    },
  };
}

const DEAF_CHANNEL: Channel = {
  listen: () => () => {},
  send: () => Promise.reject(DOWN),
};

describe("AdminModule", () => {
  it("writes the new name on its channel", async () => {
    const channel = recordingChannel();

    await new AdminModule(channel).setName("Van");

    expect(channel.commands).toEqual(["NAME:Van"]);
  });

  it("writes the new pin on its channel", async () => {
    const channel = recordingChannel();

    await new AdminModule(channel).setPin("1234");

    expect(channel.commands).toEqual(["PIN:1234"]);
  });

  it("surfaces a failed name write, so the screen can report it", async () => {
    const admin = new AdminModule(DEAF_CHANNEL);

    await expect(admin.setName("Van")).rejects.toThrow(DOWN);
  });

  it("surfaces a failed pin write, so the screen can report it", async () => {
    const admin = new AdminModule(DEAF_CHANNEL);

    await expect(admin.setPin("1234")).rejects.toThrow(DOWN);
  });
});
