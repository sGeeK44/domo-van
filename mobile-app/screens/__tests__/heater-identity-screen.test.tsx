// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// createContainer reads this switch at import time, hence the dynamic imports below.
process.env.EXPO_PUBLIC_FAKE_BLE = "1";

const { pairOnly, renderModuleScreen } = await import("./moduleScreenHarness");
const { default: HeaterIdentityScreen } = await import(
  "@/screens/heater-identity-screen"
);
const { default: ModulesScreen } = await import("@/screens/modules-screen");
const { ToastProvider } = await import("@/design-system");
const { FakeChannel } = await import("@/infrastructure/fake/FakeChannel");
const { createI18n } = await import("@/i18n/createI18n");
const { resetNavigation, routerHistory, routerStack, useRouter } = await import(
  "@/__mocks__/expo-router"
);

/** What the fake radio advertises for the heater module; a device name is data off the air. */
const PAIRED_NAME = "Heater Module (fake)";

const IDENTITY_FORM = "/settings/heater-identity";
const MODULES = "/modules";

const NAME = "Cellule arriere";
const PIN = "246810";

let commands: string[] = [];

function recordWrites() {
  const send = FakeChannel.prototype.send;
  vi.spyOn(FakeChannel.prototype, "send").mockImplementation(function (
    this: InstanceType<typeof FakeChannel>,
    command: string,
  ) {
    commands.push(command);
    return send.call(this, command);
  });
}

function identityWrites(): string[] {
  return commands.filter((command) => command.startsWith("ID:"));
}

function inputOf(testID: string): HTMLInputElement {
  const input = screen.getByTestId(testID).querySelector("input");
  if (!input) throw new Error(`no editable field under "${testID}"`);
  return input as HTMLInputElement;
}

function typeInto(testID: string, value: string) {
  fireEvent.change(inputOf(testID), { target: { value } });
}

async function identityForm() {
  const harness = renderModuleScreen(
    <ToastProvider>
      <HeaterIdentityScreen />
    </ToastProvider>,
  );
  await pairOnly(harness, ["heater"]);
  await waitFor(() => {
    expect(inputOf("module-name").value).toBe(PAIRED_NAME);
  });
  commands = [];

  return harness;
}

async function save() {
  await act(async () => {
    fireEvent.click(screen.getByTestId("settings-form-save"));
  });
}

beforeEach(() => {
  resetNavigation();
  commands = [];
  recordWrites();
});

afterEach(() => {
  vi.restoreAllMocks();
  cleanup();
});

describe("the Chauffage identity form", () => {
  it("writes the name and the PIN as one command, so the reboot cannot lose the second", async () => {
    await identityForm();

    typeInto("module-name", NAME);
    typeInto("module-pin", PIN);
    await save();

    await waitFor(() =>
      expect(identityWrites()).toEqual([`ID:NAME=${NAME};PIN=${PIN}`]),
    );
  });

  it("keeps showing the name the module accepted, not the one it was paired under", async () => {
    await identityForm();

    typeInto("module-name", NAME);
    typeInto("module-pin", PIN);
    await save();

    await waitFor(() => expect(inputOf("module-name").value).toBe(NAME));
  });

  it("says the module is restarting, which is what the ack actually confirms", async () => {
    const restarted = createI18n("fr").t("modules.admin.restarted");
    await identityForm();

    typeInto("module-name", NAME);
    typeInto("module-pin", PIN);
    await save();

    await waitFor(() => expect(screen.getByText(restarted)).toBeTruthy());
  });

  it("blocks a save the module would refuse, with nothing on the wire", async () => {
    await identityForm();

    typeInto("module-name", NAME);
    typeInto("module-pin", "12ab56");
    await save();

    expect(identityWrites()).toEqual([]);
  });
});

describe("the Modules screen's edit button", () => {
  it("pushes the Chauffage identity form, so back returns to Modules", async () => {
    const harness = renderModuleScreen(
      <ToastProvider>
        <ModulesScreen />
      </ToastProvider>,
    );
    await pairOnly(harness, ["heater"]);
    // The real entry point: Modules is a pushed route, and the form pushes on top of it.
    useRouter().push(MODULES);

    fireEvent.click(screen.getByTestId("module-edit-heater"));

    expect(routerHistory).toContainEqual({
      method: "push",
      href: IDENTITY_FORM,
    });
    expect(routerStack.at(-1)).toBe(IDENTITY_FORM);

    useRouter().back();

    expect(routerStack.at(-1)).toBe(MODULES);
  });
});
