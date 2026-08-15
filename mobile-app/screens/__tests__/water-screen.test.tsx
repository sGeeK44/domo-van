// @vitest-environment jsdom
import { act, cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// createContainer reads this switch at import time, hence the dynamic imports below.
process.env.EXPO_PUBLIC_FAKE_BLE = "1";

const { pairOnly, renderModuleScreen } = await import("./moduleScreenHarness");
const { default: WaterScreen } = await import("@/screens/water-screen");
const { ToastProvider } = await import("@/design-system");
const { FakeChannel } = await import("@/infrastructure/fake/FakeChannel");
const { resetNavigation } = await import("@/__mocks__/expo-router");

/** What the water scenario feeds, see infrastructure/fake/scenarios/waterScenario.ts. */
const CLEAN_TANK = { capacityLiters: 100, percentage: 72, liters: 72 };
const GREY_TANK = { capacityLiters: 80, percentage: 40, liters: 32 };
const AUTO_CLOSE_SECONDS = 45;

const ONE_SECOND = 1000;
const TRACK_WIDTH = 340;
const PAST_THE_THRESHOLD = 300;

/** Only the valve is written to by hand; the tanks ask for their config on their own. */
const VALVE_COMMANDS = new Set(["OPEN", "CLOSE"]);

type Write = { channel: InstanceType<typeof FakeChannel>; command: string };

let writes: Write[] = [];

/** Records which channel each command went down, so a test can push a frame back up it. */
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

function valveCommands(): string[] {
  return writes
    .map(({ command }) => command)
    .filter((command) => VALVE_COMMANDS.has(command));
}

function writesSince(mark: number): string[] {
  return writes.slice(mark).map(({ command }) => command);
}

function valveChannel(): InstanceType<typeof FakeChannel> {
  const write = writes.find(({ command }) => VALVE_COMMANDS.has(command));
  if (!write) throw new Error("no command reached the valve");
  return write.channel;
}

async function waterTab() {
  const harness = renderModuleScreen(
    <ToastProvider>
      <WaterScreen />
    </ToastProvider>,
  );
  await pairOnly(harness, ["water"]);
  await screen.findByTestId("drain-section");
}

/** react-native-web hangs the onLayout handler on the node; jsdom lays nothing out on its own. */
function measureTrack() {
  const node = screen.getByTestId("drain-slide") as HTMLElement & {
    __reactLayoutHandler?: (event: {
      nativeEvent: { layout: { width: number } };
    }) => void;
  };

  act(() =>
    node.__reactLayoutHandler?.({
      nativeEvent: { layout: { width: TRACK_WIDTH } },
    }),
  );
}

function pan() {
  return screen.getByTestId("pan-gesture");
}

function tapTheSlider() {
  measureTrack();
  return act(async () => {
    fireEvent.mouseDown(pan(), { clientX: 0 });
    fireEvent.mouseUp(pan());
  });
}

function slideAllTheWay() {
  measureTrack();
  return act(async () => {
    fireEvent.mouseDown(pan(), { clientX: 0 });
    fireEvent.mouseMove(pan(), { clientX: PAST_THE_THRESHOLD });
    fireEvent.mouseUp(pan());
  });
}

function pressCloseNow() {
  return act(async () => {
    fireEvent.click(screen.getByTestId("drain-close-now"));
  });
}

/** Fake time also runs with real time, so a test holding the valve open absorbs an extra tick. */
function elapse(seconds: number) {
  return act(async () => {
    vi.advanceTimersByTime(seconds * ONE_SECOND);
  });
}

function countdown(): string | null {
  return screen.queryByTestId("drain-countdown")?.textContent ?? null;
}

function toast(): string | null {
  return screen.queryByTestId("toast")?.textContent ?? null;
}

const OPAQUE = 1;

function opacityOf(testID: string): number {
  const tank = screen.getByTestId(testID);
  // The gauge is the caller's to dim, so the opacity sits on the slot holding it.
  const slot = tank.parentElement as HTMLElement;
  return Number(slot.style.opacity || OPAQUE);
}

describe("the Eau screen", () => {
  beforeEach(() => {
    writes = [];
    // Auto-advancing: dom-testing-library only spots fake timers behind a global jest, which vitest lacks.
    vi.useFakeTimers({ shouldAdvanceTime: true });
    recordWrites();
  });

  afterEach(async () => {
    // The fake module keeps its channels between tests: leave them as the next test expects to find them.
    for (const { channel } of writes) channel.restoreWrites();
    if (screen.queryByTestId("drain-close-now")) await pressCloseNow();
    cleanup();
    resetNavigation();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("reads both tanks, each with its capacity, its level and its share", async () => {
    await waterTab();

    expect(screen.getByText("PROPRE")).toBeTruthy();
    expect(
      screen.getByText(`cuve ${CLEAN_TANK.capacityLiters} L`),
    ).toBeTruthy();
    expect(screen.getByText(String(CLEAN_TANK.liters))).toBeTruthy();
    expect(
      screen.getByText(`${CLEAN_TANK.percentage} % de la cuve`),
    ).toBeTruthy();

    expect(screen.getByText("GRISE")).toBeTruthy();
    expect(screen.getByText(String(GREY_TANK.liters))).toBeTruthy();
    expect(
      screen.getByText(
        `${GREY_TANK.percentage} % · ${GREY_TANK.capacityLiters - GREY_TANK.liters} L avant plein`,
      ),
    ).toBeTruthy();
  });

  // The ticket's first acceptance example.
  it("opens nothing on a tap: the valve takes a deliberate gesture", async () => {
    await waterTab();
    const settled = writes.length;

    await tapTheSlider();

    expect(writesSince(settled)).toEqual([]);
    expect(countdown()).toBeNull();
    expect(screen.getByTestId("drain-slide")).toBeTruthy();
  });

  // The ticket's second acceptance example.
  it("opens the valve on a completed slide, on the module's own delay", async () => {
    await waterTab();

    await slideAllTheWay();

    expect(valveCommands()).toEqual(["OPEN"]);
    expect(countdown()).toBe(`${AUTO_CLOSE_SECONDS} s`);
    expect(screen.getByTestId("progress-bar")).toBeTruthy();
    expect(toast()).toBe("Vanne ouverte");
  });

  it("follows the module's countdown rather than a clock of its own", async () => {
    await waterTab();
    await slideAllTheWay();

    // Out of step with the cadence on purpose: a clock of its own would still read 45 s.
    await act(async () => {
      valveChannel().emit("COUNTDOWN:7");
    });

    expect(countdown()).toBe("7 s");
  });

  // The ticket's fourth acceptance example.
  it("closes at once, and drops the countdown, on FERMER MAINTENANT", async () => {
    await waterTab();
    await slideAllTheWay();

    await pressCloseNow();

    expect(valveCommands()).toEqual(["OPEN", "CLOSE"]);
    expect(countdown()).toBeNull();
    expect(screen.getByTestId("drain-slide")).toBeTruthy();
    expect(toast()).toBe("Vanne fermée");
  });

  // The module ticks at 1 Hz, so a countdown frame can already be on the wire when the user closes.
  it("does not read a countdown landing after a close as a reopen", async () => {
    await waterTab();
    await slideAllTheWay();
    await pressCloseNow();

    await act(async () => {
      valveChannel().emit("COUNTDOWN:44");
    });

    expect(countdown()).toBeNull();
    expect(toast()).toBe("Vanne fermée");
  });

  it("never claims a close that the link dropped, and shows the valve still draining", async () => {
    await waterTab();
    await slideAllTheWay();
    valveChannel().failWrites();

    await pressCloseNow();

    expect(toast()).toBe("Erreur lors de la fermeture de la vanne.");

    await elapse(2);

    expect(screen.getByText("se vide")).toBeTruthy();
    expect(screen.getByTestId("drain-close-now")).toBeTruthy();
  });

  // The ticket's third acceptance example.
  it("returns to rest, and says so, when the module closes itself", async () => {
    await waterTab();
    await slideAllTheWay();

    await elapse(AUTO_CLOSE_SECONDS);

    expect(valveCommands()).toEqual(["OPEN"]);
    expect(countdown()).toBeNull();
    expect(screen.getByTestId("drain-slide")).toBeTruthy();
    expect(toast()).toBe("Vanne refermée automatiquement");
  });

  it("de-emphasises the clean tank, and only it, while the grey one drains", async () => {
    await waterTab();
    expect(opacityOf("clean-tank")).toBe(OPAQUE);

    await slideAllTheWay();

    expect(opacityOf("clean-tank")).toBe(0.55);
    expect(opacityOf("grey-tank")).toBe(OPAQUE);
    expect(screen.getByText("se vide")).toBeTruthy();
  });
});
