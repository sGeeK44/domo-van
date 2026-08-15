// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// createContainer reads this switch at import time, hence the dynamic imports below.
process.env.EXPO_PUBLIC_FAKE_BLE = "1";

/** Every message the screen asked the toast to show: the provider only ever renders the last. */
const toastSpy = vi.hoisted(() => ({
  shown: [] as string[],
  wrappers: new WeakMap<object, { show: (message: string) => void }>(),
}));

vi.mock("@/design-system", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/design-system")>();

  return {
    ...actual,
    useToast: () => {
      const real = actual.useToast();
      const known = toastSpy.wrappers.get(real);
      if (known) return known;

      const spy = {
        show: (message: string) => {
          toastSpy.shown.push(message);
          real.show(message);
        },
      };
      toastSpy.wrappers.set(real, spy);
      return spy;
    },
  };
});

const { pairOnly, renderModuleScreen } = await import("./moduleScreenHarness");
const HeaterScreen = (await import("@/screens/heater-screen")).default;
const { ToastProvider } = await import("@/design-system");
const { resetNavigation } = await import("@/__mocks__/expo-router");

/** The zones the heater scenario feeds, see infrastructure/fake/scenarios/heaterScenario.ts. */
const SALON = 0;
const CHAMBRE = 1;
const SDB = 2;
const SOUTE = 3;
const ALL_ZONES = [SALON, CHAMBRE, SDB, SOUTE];

/** The channel each zone is opened on, see domain/heater/HeaterSystem.ts. */
const ZONE_CHANNELS = ["0002", "0003", "0004", "0005"];

const STOPPED = "à l'arrêt";
const NIGHT_ON_TOAST = "Mode nuit — cibles abaissées";
const ALL_STOPPED_TOAST = "Toutes les zones arrêtées";

async function heaterTab() {
  const harness = renderModuleScreen(
    <ToastProvider>
      <HeaterScreen />
    </ToastProvider>,
  );
  await pairOnly(harness, ["heater"]);
  await screen.findByTestId(`heater-zone-${SALON}`);
  toastSpy.shown.length = 0;
  return harness;
}

function zone(index: number) {
  return within(screen.getByTestId(`heater-zone-${index}`));
}

function partOf(index: number, testID: string): CSSStyleDeclaration {
  return zone(index).getByTestId(testID).style;
}

function press(element: Element) {
  return act(async () => {
    fireEvent.click(element);
  });
}

function nightModeButton() {
  return screen.getByTestId("preset-night-mode");
}

/** React Native only aliases aria-selected onto accessibilityState; aria-pressed reaches no view manager. */
function pressedState(button: Element): string | null {
  return button.getAttribute("aria-selected");
}

describe("the Chauffage tab", () => {
  afterEach(() => {
    cleanup();
    resetNavigation();
    toastSpy.shown.length = 0;
  });

  it("reads every zone off the module", async () => {
    await heaterTab();

    expect(zone(SALON).getByText("SALON")).toBeTruthy();
    expect(zone(SALON).getByText("21.5°")).toBeTruthy();
    expect(zone(SALON).getByText("cible 21.0")).toBeTruthy();
    expect(zone(CHAMBRE).getByText("CHAMBRE")).toBeTruthy();
    expect(zone(CHAMBRE).getByText(STOPPED)).toBeTruthy();
  });

  it("paints each bar on the 10–30 °C span the zones share", async () => {
    await heaterTab();

    // Salon reads 21.5 ° for a 21.0 ° target, Soute 23.0 ° for 22.5 °: (t − 10) / 20.
    expect(partOf(SALON, "gauge-fill").width).toBe("57.5%");
    expect(partOf(SALON, "gauge-marker").left).toBe("55%");
    expect(partOf(SOUTE, "gauge-fill").width).toBe("65%");
    expect(partOf(SOUTE, "gauge-marker").left).toBe("62.5%");
  });

  // The ticket's example: "Chambre" is off, and a + brings it back with its target half a degree up.
  it("switches a stopped zone back on when its target is stepped", async () => {
    await heaterTab();

    await press(zone(CHAMBRE).getByTestId("setpoint-increase"));

    expect(zone(CHAMBRE).getByText("cible 20.0")).toBeTruthy();
    // A running zone marks its target again; a stopped one marks none.
    expect(zone(CHAMBRE).getByTestId("gauge-marker")).toBeTruthy();
  });

  it("says nothing on a half-degree step or a power toggle", async () => {
    await heaterTab();
    expect(zone(CHAMBRE).queryByTestId("gauge-marker")).toBeNull();

    await press(zone(SALON).getByTestId("setpoint-increase"));

    expect(zone(SALON).getByText("cible 21.5")).toBeTruthy();

    await press(zone(SALON).getByTestId("setpoint-power"));

    expect(zone(SALON).getByText(STOPPED)).toBeTruthy();
    // Neither the step, nor the toggle, nor the OK each of them is answered with.
    expect(toastSpy.shown).toEqual([]);
  });

  it("puts the living zones on their night targets and stops the others", async () => {
    await heaterTab();

    await press(nightModeButton());

    expect(zone(SALON).getByText("cible 18.0")).toBeTruthy();
    expect(zone(CHAMBRE).getByText("cible 17.0")).toBeTruthy();
    expect(zone(SDB).getByText(STOPPED)).toBeTruthy();
    expect(zone(SOUTE).getByText(STOPPED)).toBeTruthy();
    expect(toastSpy.shown).toEqual([NIGHT_ON_TOAST]);
  });

  // Planning decision 7: a toast confirms a coarse action, never a ½ degree.
  it("leaves night mode on a hand-made step without announcing it", async () => {
    await heaterTab();
    await press(nightModeButton());
    expect(pressedState(nightModeButton())).toBe("true");
    toastSpy.shown.length = 0;

    await press(zone(SDB).getByTestId("setpoint-increase"));

    expect(pressedState(nightModeButton())).toBe("false");
    expect(toastSpy.shown).toEqual([]);
  });

  // Decision 3 forbids restoring day targets, so the button reports a state it never undoes:
  // a second press re-sends the preset, which is also how a flag left stale by a power-cycle recovers.
  it("re-sends night mode on a second press rather than undoing it", async () => {
    await heaterTab();

    await press(nightModeButton());
    await press(zone(SDB).getByTestId("setpoint-power"));
    await press(nightModeButton());

    expect(pressedState(nightModeButton())).toBe("true");
    expect(zone(SDB).getByText(STOPPED)).toBeTruthy();
    expect(toastSpy.shown.at(-1)).toBe(NIGHT_ON_TOAST);
  });

  // Tout arrêter is a command, not a state: it never reports itself as pressed.
  it("exposes a pressed state for the preset only, never for the command", async () => {
    await heaterTab();

    expect(pressedState(nightModeButton())).toBe("false");
    expect(pressedState(screen.getByTestId("preset-stop-all"))).toBeNull();
  });

  it("stops all four zones in one action, and confirms it once", async () => {
    await heaterTab();
    await press(nightModeButton());
    toastSpy.shown.length = 0;

    await press(screen.getByTestId("preset-stop-all"));

    for (const index of ALL_ZONES) {
      expect(zone(index).getByText(STOPPED)).toBeTruthy();
    }
    // Stopping everything also leaves night mode: one action, one confirmation.
    expect(toastSpy.shown).toEqual([ALL_STOPPED_TOAST]);
  });

  it("offers no step past the top of the range", async () => {
    await heaterTab();
    const raise = () => zone(SOUTE).getByTestId("setpoint-increase");

    // 22.5 °C to the 30 °C ceiling, then one press too many.
    for (let step = 0; step < 16; step++) await press(raise());

    expect(zone(SOUTE).getByText("cible 30.0")).toBeTruthy();
    expect(raise().getAttribute("aria-disabled")).toBe("true");
  });

  it("offers no step past the bottom of the range", async () => {
    await heaterTab();
    const lower = () => zone(SDB).getByTestId("setpoint-decrease");

    // 18.5 °C to the 5 °C floor, then one press too many.
    for (let step = 0; step < 28; step++) await press(lower());

    expect(zone(SDB).getByText("cible 5.0")).toBeTruthy();
    expect(lower().getAttribute("aria-disabled")).toBe("true");
  });

  // The firmware keeps the target of a zone that was switched off, and + is the way back on.
  it("still steps a stopped zone whose target sits on a bound", async () => {
    await heaterTab();
    const raise = () => zone(SOUTE).getByTestId("setpoint-increase");
    for (let step = 0; step < 15; step++) await press(raise());
    await press(zone(SOUTE).getByTestId("setpoint-power"));
    expect(zone(SOUTE).getByText(STOPPED)).toBeTruthy();

    expect(raise().getAttribute("aria-disabled")).not.toBe("true");
    await press(raise());

    expect(zone(SOUTE).getByText("cible 30.0")).toBeTruthy();
    expect(zone(SOUTE).getByTestId("gauge-marker")).toBeTruthy();
  });

  it("reports what a zone's firmware refuses", async () => {
    const harness = await heaterTab();

    await act(async () => {
      harness.firmwareFrame("heater", ZONE_CHANNELS[SDB], "ERR_NO_SENSOR");
    });

    expect(toastSpy.shown).toEqual(["Erreur: ERR_NO_SENSOR"]);
  });
});
