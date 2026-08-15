// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { afterEach, describe, expect, it } from "vitest";
import type { BatterySnapshot } from "@/domain/battery/BatteryTelemetry";

// createContainer reads this switch at import time, hence the dynamic imports below.
process.env.EXPO_PUBLIC_FAKE_BLE = "1";

const { pairOnly, renderModuleScreen } = await import("./moduleScreenHarness");
const { default: BatteryInfoScreen, BatteryInfoCards } = await import(
  "@/screens/battery-info-screen"
);
const { createObservable } = await import("@/core/observable");
const { DEFAULT_BATTERY_SNAPSHOT } = await import(
  "@/domain/battery/BatteryTelemetry"
);
const { Colors, ThemeProvider } = await import("@/design-system");
const { createI18n } = await import("@/i18n/createI18n");
const { resetNavigation } = await import("@/__mocks__/expo-router");

type ThemeName = keyof typeof Colors;

const THEMES: ThemeName[] = ["light", "dark"];

/** The pack the mockup shows, at the precision the BMS reports it. */
const PACK: Partial<BatterySnapshot> = {
  percentage: 82,
  voltage: 13.2,
  current: -6.6,
  remainingAh: 164,
  capacityAh: 200,
  cycleCount: 143,
  maxCellVoltage: 3.361,
  minCellVoltage: 3.338,
  cellDelta: 0.023,
  tempMos: 28.4,
  tempCell1: 21.9,
  tempCell2: 22.3,
};

function renderCards(
  overrides: Partial<BatterySnapshot>,
  theme: ThemeName = "dark",
) {
  const battery: BatterySnapshot = {
    ...DEFAULT_BATTERY_SNAPSHOT,
    ...overrides,
  };

  render(
    <I18nextProvider i18n={createI18n("fr")}>
      <ThemeProvider initialMode={theme}>
        <BatteryInfoCards telemetry={createObservable(battery)} />
      </ThemeProvider>
    </I18nextProvider>,
  );
}

function readout(labelKey: string): string {
  return (
    screen.getByTestId(`readout-battery.info.${labelKey}`).textContent ?? ""
  );
}

describe("the battery information cards", () => {
  afterEach(cleanup);

  it("reads every value off the snapshot the BMS published", () => {
    renderCards(PACK);

    expect(readout("state")).toBe("ÉTAT82%");
    expect(readout("voltage")).toBe("TENSION13.20V");
    expect(readout("current")).toBe("COURANT-6.60A");
    expect(readout("remaining")).toBe("RESTANTE164.0Ah");
    expect(readout("nominal")).toBe("NOMINALE200.0Ah");
    expect(readout("cycles")).toBe("CYCLES143");
    expect(readout("maxCell")).toBe("MAX3.361V");
    expect(readout("minCell")).toBe("MIN3.338V");
    expect(readout("delta")).toBe("ÉCART23mV");
    expect(readout("mosfet")).toBe("MOSFET28.4°C");
    expect(readout("probe1")).toBe("SONDE 121.9°C");
    expect(readout("probe2")).toBe("SONDE 222.3°C");
  });

  it("follows the pack when a new frame arrives", () => {
    renderCards({ ...PACK, percentage: 41 });

    expect(readout("state")).toBe("ÉTAT41%");
  });

  it.each(THEMES)("bars all four cards with the battery fill (%s)", (theme) => {
    renderCards(PACK, theme);

    const bars = screen.getAllByTestId(/^card-battery\.info\..*-bar$/);

    expect(bars).toHaveLength(4);
  });
});

describe("the battery information form", () => {
  afterEach(() => {
    cleanup();
    resetNavigation();
  });

  // Acceptance example 8: nothing on this screen is editable.
  it("offers no field to type in and no save button", async () => {
    const harness = renderModuleScreen(<BatteryInfoScreen />);
    await pairOnly(harness, ["battery"]);
    await screen.findByTestId("readout-battery.info.state");

    expect(document.querySelectorAll("input")).toHaveLength(0);
    expect(screen.queryByTestId("settings-form-save")).toBeNull();
  });

  it("says in so many words that it changes nothing", async () => {
    const harness = renderModuleScreen(<BatteryInfoScreen />);
    await pairOnly(harness, ["battery"]);

    expect(
      await screen.findByText(
        "Lecture seule. Aucune de ces valeurs n'est modifiable depuis l'application.",
      ),
    ).toBeTruthy();
  });

  it("shows what the fake BMS reports once the module is online", async () => {
    const harness = renderModuleScreen(<BatteryInfoScreen />);
    await pairOnly(harness, ["battery"]);

    // The corpus' pack: 98 %, 13.20 V, see infrastructure/fake/scenarios/jkBmsFrames.ts.
    expect(await screen.findByText("98")).toBeTruthy();
    expect(screen.getByText("13.20")).toBeTruthy();
  });
});
