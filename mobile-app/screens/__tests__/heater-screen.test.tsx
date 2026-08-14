// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

// createContainer reads this switch at import time, hence the dynamic imports below.
process.env.EXPO_PUBLIC_FAKE_BLE = "1";

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

const STOPPED = "à l'arrêt";
const NIGHT_ON_TOAST = "Mode nuit — cibles abaissées";
const NIGHT_OFF_TOAST = "Mode nuit désactivé";
const ALL_STOPPED_TOAST = "Toutes les zones arrêtées";

async function heaterTab() {
  const harness = renderModuleScreen(
    <ToastProvider>
      <HeaterScreen />
    </ToastProvider>,
  );
  await pairOnly(harness, ["heater"]);
  await screen.findByTestId(`heater-zone-${SALON}`);
  return harness;
}

function zone(index: number) {
  return within(screen.getByTestId(`heater-zone-${index}`));
}

function press(element: Element) {
  return act(async () => {
    fireEvent.click(element);
  });
}

function nightModeButton() {
  return screen.getByTestId("preset-night-mode");
}

function toastText(): string | null {
  return screen.queryByTestId("toast")?.textContent ?? null;
}

describe("the Chauffage tab", () => {
  afterEach(() => {
    cleanup();
    resetNavigation();
  });

  it("reads every zone off the module", async () => {
    await heaterTab();

    expect(zone(SALON).getByText("SALON")).toBeTruthy();
    expect(zone(SALON).getByText("21.5°")).toBeTruthy();
    expect(zone(SALON).getByText("cible 21.0")).toBeTruthy();
    expect(zone(CHAMBRE).getByText("CHAMBRE")).toBeTruthy();
    expect(zone(CHAMBRE).getByText(STOPPED)).toBeTruthy();
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
    expect(toastText()).toBeNull();

    await press(zone(SALON).getByTestId("setpoint-power"));

    expect(zone(SALON).getByText(STOPPED)).toBeTruthy();
    expect(toastText()).toBeNull();
  });

  it("puts the living zones on their night targets and stops the others", async () => {
    await heaterTab();

    await press(nightModeButton());

    expect(zone(SALON).getByText("cible 18.0")).toBeTruthy();
    expect(zone(CHAMBRE).getByText("cible 17.0")).toBeTruthy();
    expect(zone(SDB).getByText(STOPPED)).toBeTruthy();
    expect(zone(SOUTE).getByText(STOPPED)).toBeTruthy();
    expect(toastText()).toBe(NIGHT_ON_TOAST);
  });

  it("leaves night mode as soon as a target is adjusted by hand", async () => {
    await heaterTab();
    await press(nightModeButton());
    expect(nightModeButton().getAttribute("aria-selected")).toBe("true");

    await press(zone(SDB).getByTestId("setpoint-increase"));

    expect(nightModeButton().getAttribute("aria-selected")).toBe("false");
    expect(toastText()).toBe(NIGHT_OFF_TOAST);
  });

  // Decision 3 forbids restoring day targets, so the button reports a state it never undoes:
  // a second press re-sends the preset, which is also how a flag left stale by a power-cycle recovers.
  it("re-sends night mode on a second press rather than undoing it", async () => {
    await heaterTab();

    await press(nightModeButton());
    await press(zone(SDB).getByTestId("setpoint-power"));
    await press(nightModeButton());

    expect(nightModeButton().getAttribute("aria-selected")).toBe("true");
    expect(zone(SDB).getByText(STOPPED)).toBeTruthy();
    expect(toastText()).toBe(NIGHT_ON_TOAST);
  });

  it("stops all four zones in one action, and confirms it once", async () => {
    await heaterTab();
    await press(nightModeButton());

    await press(screen.getByTestId("preset-stop-all"));

    for (const index of ALL_ZONES) {
      expect(zone(index).getByText(STOPPED)).toBeTruthy();
    }
    // Stopping everything also leaves night mode: one action, one confirmation.
    expect(screen.getAllByTestId("toast")).toHaveLength(1);
    expect(toastText()).toBe(ALL_STOPPED_TOAST);
  });

  it("offers no step past the top of the range", async () => {
    await heaterTab();
    const raise = () => zone(SOUTE).getByTestId("setpoint-increase");

    // 22.5 °C to the 30 °C ceiling, then one press too many.
    for (let step = 0; step < 16; step++) await press(raise());

    expect(zone(SOUTE).getByText("cible 30.0")).toBeTruthy();
    expect(raise().getAttribute("aria-disabled")).toBe("true");
  });
});
