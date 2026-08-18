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
const { default: WaterIdentityScreen } = await import(
  "@/screens/water-identity-screen"
);
const { ModuleSettingsSection } = await import(
  "@/screens/module-settings-section"
);
const { Colors, ToastProvider } = await import("@/design-system");
const { FakeChannel } = await import("@/infrastructure/fake/FakeChannel");
const { resetNavigation, routerStack, useRouter } = await import(
  "@/__mocks__/expo-router"
);

/** What the fake radio advertises for the water module; a device name is data off the air. */
const PAIRED_NAME = "Water Module (fake)";

const IDENTITY_FORM = "/settings/water-identity";
const SETTINGS = "/settings";

const NAME = "Cuve avant";
const PIN = "123456";

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

async function identityForm() {
  const harness = renderModuleScreen(
    <ToastProvider>
      <WaterIdentityScreen />
    </ToastProvider>,
  );
  await pairOnly(harness, ["water"]);
  await waitFor(() => {
    expect(valueOf("module-name")).toBe(PAIRED_NAME);
  });
  commands = [];

  return harness;
}

function inputOf(testID: string): HTMLInputElement {
  const input = screen.getByTestId(testID).querySelector("input");
  if (!input) throw new Error(`no editable field under "${testID}"`);
  return input as HTMLInputElement;
}

function valueOf(testID: string): string {
  return inputOf(testID).value;
}

function type(testID: string, value: string) {
  fireEvent.change(inputOf(testID), { target: { value } });
}

function pressSave() {
  return act(async () => {
    fireEvent.click(screen.getByTestId("settings-form-save"));
  });
}

function toast(): string | null {
  return screen.queryByTestId("toast")?.textContent ?? null;
}

/** The palette is written in hex; the DOM answers in rgb(). */
function rgb(hex: string): string {
  const [red, green, blue] = [1, 3, 5].map((start) =>
    Number.parseInt(hex.slice(start, start + 2), 16),
  );
  return `rgb(${red}, ${green}, ${blue})`;
}

/** Either theme may be up under the harness; both paint a refused value with the same token. */
const DANGER = [rgb(Colors.light.danger), rgb(Colors.dark.danger)];

function borderOf(testID: string): string {
  return window.getComputedStyle(screen.getByTestId(`${testID}-box`))
    .borderTopColor;
}

describe("the Eau — identité form", () => {
  beforeEach(() => {
    commands = [];
    recordWrites();
  });

  afterEach(() => {
    cleanup();
    resetNavigation();
    vi.restoreAllMocks();
  });

  it("opens on the paired device's name and on no PIN, which the module never reports", async () => {
    await identityForm();

    expect(valueOf("module-name")).toBe(PAIRED_NAME);
    expect(valueOf("module-pin")).toBe("");
  });

  it("marks nothing before the first keystroke, PIN included", async () => {
    await identityForm();

    expect(DANGER).not.toContain(borderOf("module-pin"));
    expect(DANGER).not.toContain(borderOf("module-name"));
  });

  // One atomic command: the module reboots on the ack, so a second write would be lost.
  it("sends the name and the PIN as one command", async () => {
    await identityForm();

    type("module-name", NAME);
    type("module-pin", PIN);
    await pressSave();

    expect(identityWrites()).toEqual([`ID:NAME=${NAME};PIN=${PIN}`]);
  });

  it("confirms the restart the module answers a saved identity with", async () => {
    await identityForm();

    type("module-name", NAME);
    type("module-pin", PIN);
    await pressSave();

    expect(toast()).toBe("OK. Le module va redémarrer. Reconnecte-toi.");
  });

  // The module never reports a PIN, so an untouched form is already unsaveable — silently, before.
  it("says why the button did nothing when pressed on an untouched form", async () => {
    await identityForm();

    await pressSave();

    expect(identityWrites()).toEqual([]);
    expect(DANGER).toContain(borderOf("module-pin"));
  });

  // A slot's pairing is written once, at pairing time, and no reconnection refreshes it.
  it("keeps showing the name the module accepted, not the one it was paired under", async () => {
    await identityForm();

    type("module-name", NAME);
    type("module-pin", PIN);
    await pressSave();

    await waitFor(() => {
      expect(valueOf("module-name")).toBe(NAME);
    });
    expect(valueOf("module-pin")).toBe("");
  });

  it("marks a PIN that is not six digits and sends nothing", async () => {
    await identityForm();

    type("module-name", NAME);
    type("module-pin", "12345");
    await pressSave();

    expect(identityWrites()).toEqual([]);
    expect(DANGER).toContain(borderOf("module-pin"));
    // A press that reaches no module says why, rather than reading as a dead button.
    expect(toast()).toBe("Corrige les champs en rouge avant d'enregistrer.");
  });

  it("marks a name the firmware would refuse and sends nothing", async () => {
    await identityForm();

    type("module-name", "Réservoir#1");
    type("module-pin", PIN);
    await pressSave();

    expect(identityWrites()).toEqual([]);
    expect(DANGER).toContain(borderOf("module-name"));
  });
});

// Planning decision 12 and acceptance example 4, on the one surface that reaches this form.
describe("the way into the Eau identity form", () => {
  beforeEach(() => {
    commands = [];
    recordWrites();
  });

  afterEach(() => {
    cleanup();
    resetNavigation();
    vi.restoreAllMocks();
  });

  it("returns to Réglages its edit button opened it from", async () => {
    useRouter().push(SETTINGS);
    const settings = renderModuleScreen(<ModuleSettingsSection />);
    await pairOnly(settings, ["water"]);

    fireEvent.click(screen.getByTestId("module-edit-water"));
    expect(routerStack.at(-1)).toBe(IDENTITY_FORM);
    cleanup();

    await identityForm();
    fireEvent.click(screen.getByText("arrow-back"));

    expect(routerStack.at(-1)).toBe(SETTINGS);
  });
});
