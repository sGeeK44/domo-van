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
const { default: WaterTanksScreen } = await import(
  "@/screens/water-tanks-screen"
);
const { Colors, ToastProvider } = await import("@/design-system");
const { DEFAULT_WRITE_TIMEOUT_MS } = await import("@/domain/ConfirmedWrite");
const { FakeChannel } = await import("@/infrastructure/fake/FakeChannel");
const { resetNavigation } = await import("@/__mocks__/expo-router");

/** What the water scenario reports, see infrastructure/fake/scenarios/waterScenario.ts. */
const REPORTED = {
  cleanVolume: "100",
  cleanHeight: "200",
  greyVolume: "80",
  greyHeight: "150",
  autoCloseSeconds: "45",
};

const CLEAN_CHANNEL = "0002";

/** The one height the fake hears and never answers, so the timeout path is reachable off-vehicle. */
const SILENT_HEIGHT = "9999";

/** Past the 5000 L the firmware stores, so the fake answers ERR_CFG_RANGE. */
const OUT_OF_RANGE_VOLUME = "6000";

type Write = { channel: InstanceType<typeof FakeChannel>; command: string };

let writes: Write[] = [];
let clockMs = 0;

/** Records which channel each command went down, so a save can be counted per channel. */
function recordWrites() {
  const send = FakeChannel.prototype.send;
  vi.spyOn(FakeChannel.prototype, "send").mockImplementation(function (
    this: InstanceType<typeof FakeChannel>,
    command: string,
  ) {
    writes.push({ channel: this, command });
    return send.call(this, command);
  });
}

/** ConfirmedWrite measures its deadline on sinceBoot, so the clock moves with the timers. */
function elapse(millis: number) {
  clockMs += millis;
  return act(async () => {
    vi.advanceTimersByTime(millis);
  });
}

function configWrites(): Write[] {
  return writes.filter(({ command }) => command.startsWith("CFG:"));
}

async function tanksForm() {
  const harness = renderModuleScreen(
    <ToastProvider>
      <WaterTanksScreen />
    </ToastProvider>,
  );
  await pairOnly(harness, ["water"]);
  await waitFor(() => {
    expect(valueOf("clean-volume")).toBe(REPORTED.cleanVolume);
  });
  writes = [];

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

describe("the Eau — cuves et vanne form", () => {
  beforeEach(() => {
    writes = [];
    clockMs = 0;
    // Auto-advancing: dom-testing-library only spots fake timers behind a global jest, which vitest lacks.
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.spyOn(performance, "now").mockImplementation(() => clockMs);
    recordWrites();
  });

  afterEach(() => {
    cleanup();
    resetNavigation();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("opens on the five values the module reports", async () => {
    await tanksForm();

    expect(valueOf("clean-volume")).toBe(REPORTED.cleanVolume);
    expect(valueOf("clean-height")).toBe(REPORTED.cleanHeight);
    expect(valueOf("grey-volume")).toBe(REPORTED.greyVolume);
    expect(valueOf("grey-height")).toBe(REPORTED.greyHeight);
    expect(valueOf("auto-close")).toBe(REPORTED.autoCloseSeconds);
  });

  // Acceptance example 1, first half: an untouched form still follows the module.
  it("takes a config frame arriving before the first keystroke", async () => {
    const harness = await tanksForm();

    act(() => harness.firmwareFrame("water", CLEAN_CHANNEL, "CFG:V=120;H=850"));

    expect(valueOf("clean-volume")).toBe("120");
    expect(valueOf("clean-height")).toBe("850");
  });

  // Acceptance example 1, second half: the bug this epic exists to fix.
  it("keeps the typed volume when a distance frame arrives while it is edited", async () => {
    const harness = await tanksForm();

    type("clean-volume", "42");
    act(() => harness.firmwareFrame("water", CLEAN_CHANNEL, "56"));

    expect(valueOf("clean-volume")).toBe("42");
  });

  it("keeps the typed volume when the module re-reports its own config", async () => {
    const harness = await tanksForm();

    type("clean-volume", "42");
    act(() => harness.firmwareFrame("water", CLEAN_CHANNEL, "CFG:V=120;H=850"));

    expect(valueOf("clean-volume")).toBe("42");
  });

  // Acceptance example 2: one action, five fields, three channels.
  it("writes both tanks and the valve on one press", async () => {
    await tanksForm();

    type("clean-volume", "120");
    type("clean-height", "850");
    type("grey-volume", "90");
    type("grey-height", "160");
    type("auto-close", "60");
    await pressSave();

    expect(
      configWrites()
        .map(({ command }) => command)
        .sort(),
    ).toEqual(["CFG:T=60", "CFG:V=120;H=850", "CFG:V=90;H=160"]);
    expect(new Set(configWrites().map(({ channel }) => channel)).size).toBe(3);
    expect(toast()).toBe("Configuration envoyée au module");
  });

  // Acceptance example 3: the module hears the write and never answers it.
  it("says the configuration was not applied when the module never acks", async () => {
    await tanksForm();

    type("clean-height", SILENT_HEIGHT);
    await pressSave();
    await elapse(DEFAULT_WRITE_TIMEOUT_MS);

    expect(toast()).toBe(
      "Cuve propre : le module n'a pas confirmé. Configuration non appliquée.",
    );
    // We do not know what the module holds, and this is the moment the user retries.
    expect(valueOf("clean-height")).toBe(SILENT_HEIGHT);
  });

  it("reports a refused value as a refusal, and falls back to what the module holds", async () => {
    await tanksForm();

    type("clean-volume", OUT_OF_RANGE_VOLUME);
    await pressSave();

    expect(toast()).toBe("Cuve propre : valeur refusée par le module.");
    await waitFor(() => {
      expect(valueOf("clean-volume")).toBe(REPORTED.cleanVolume);
    });
  });

  it("marks a volume the form refuses and sends nothing at all", async () => {
    await tanksForm();

    type("clean-volume", "0");
    await pressSave();

    expect(configWrites()).toEqual([]);
    expect(DANGER).toContain(borderOf("clean-volume"));
    expect(DANGER).not.toContain(borderOf("grey-volume"));
    // A press that reaches no module says why, rather than reading as a dead button.
    expect(toast()).toBe("Corrige les champs en rouge avant d'enregistrer.");
  });

  // Before the first press, a danger border would be about a value nobody typed.
  it("marks a refused value only once the button has been pressed", async () => {
    await tanksForm();

    type("clean-volume", "0");
    expect(DANGER).not.toContain(borderOf("clean-volume"));

    await pressSave();

    expect(DANGER).toContain(borderOf("clean-volume"));
  });

  it("marks a valve delay past the five minutes the firmware stores", async () => {
    await tanksForm();

    type("auto-close", "301");
    await pressSave();

    expect(configWrites()).toEqual([]);
    expect(DANGER).toContain(borderOf("auto-close"));
  });
});
