// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { afterEach, describe, expect, it } from "vitest";
import type { BatterySnapshot } from "@/domain/battery/BatteryTelemetry";

// createContainer reads this switch at import time, hence the dynamic imports below.
process.env.EXPO_PUBLIC_FAKE_BLE = "1";

const { pairOnly, renderModuleScreen } = await import("./moduleScreenHarness");
const { default: BatteryScreen, BatteryDetail } = await import(
  "@/screens/battery-screen"
);
const { createObservable } = await import("@/core/observable");
const { DEFAULT_BATTERY_SNAPSHOT } = await import(
  "@/domain/battery/BatteryTelemetry"
);
const { Colors, ThemeProvider } = await import("@/design-system");
const { createI18n } = await import("@/i18n/createI18n");
const { resetNavigation, routerHistory } = await import(
  "@/__mocks__/expo-router"
);

type ThemeName = keyof typeof Colors;

const THEMES: ThemeName[] = ["light", "dark"];

/** The mockup's pack: four cells 23 mV apart, the fourth being the weakest. */
const MOCKUP_CELLS = [3.352, 3.349, 3.361, 3.338];

/** The pack the fake BMS corpus replays, see infrastructure/fake/scenarios/jkBmsFrames.ts. */
const FAKE_CELL_COUNT = "CELLULES · 4S";
const FAKE_WEAKEST_CELL = "C3 min";

const ANY_CELL_LABEL = /^C\d+( min)?$/;

function renderDetail(
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
        <BatteryDetail telemetry={createObservable(battery)} />
      </ThemeProvider>
    </I18nextProvider>,
  );
}

/** A themed StyleSheet reaches the DOM as a class, so the cascade has to be resolved. */
function paintOf(testID: string): CSSStyleDeclaration {
  return window.getComputedStyle(screen.getByTestId(testID));
}

/** The palette spells a colour in hex or in rgba(); the DOM answers in rgb() and keeps the alpha. */
function css(color: string): string {
  if (color.startsWith("rgba(")) {
    const [red, green, blue, alpha] = color.slice(5, -1).split(",").map(Number);
    return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
  }
  const [red, green, blue] = [1, 3, 5].map((start) =>
    Number.parseInt(color.slice(start, start + 2), 16),
  );
  return `rgb(${red}, ${green}, ${blue})`;
}

function cellLabels(): string[] {
  return screen
    .getAllByText(ANY_CELL_LABEL)
    .map((element) => element.textContent ?? "");
}

describe("the battery detail", () => {
  afterEach(() => {
    cleanup();
    resetNavigation();
  });

  it("shows the pack, its readings and its temperatures", () => {
    renderDetail({
      percentage: 82,
      voltage: 13.4,
      current: -6.6,
      power: -88,
      remainingAh: 164,
      capacityAh: 200,
      cycleCount: 143,
      tempMos: 28.4,
      tempCell1: 21.9,
      tempCell2: 22.3,
      isDischarging: true,
    });

    const hero = screen.getByTestId("battery-hero");

    expect(hero.textContent).toContain("DÉCHARGE · 164 / 200 Ah");
    expect(hero.textContent).toContain("82%");
    expect(hero.textContent).toContain("à -88 W");
    expect(screen.getByTestId("stat-voltage").textContent).toBe(
      "TENSION13.4 V",
    );
    expect(screen.getByTestId("stat-current").textContent).toBe(
      "COURANT-6.6 A",
    );
    expect(screen.getByTestId("stat-cycles").textContent).toBe("CYCLES143");
    expect(screen.getByTestId("stat-mosfet").textContent).toBe("MOSFET28.4°");
    expect(screen.getByTestId("stat-probe1").textContent).toBe("SONDE 121.9°");
    expect(screen.getByTestId("stat-probe2").textContent).toBe("SONDE 222.3°");
  });

  // The ticket's example: one cell below the others, identified as the weakest.
  it("marks the weakest cell by its label, and marks no other", () => {
    renderDetail({ cellVoltages: MOCKUP_CELLS, cellCount: 4 });

    expect(cellLabels()).toEqual(["C1", "C2", "C3", "C4 min"]);
  });

  it("draws one bar per cell the BMS reports, whatever the pack's size", () => {
    renderDetail({ cellVoltages: [3.3, 3.31, 3.29], cellCount: 3 });

    expect(cellLabels()).toHaveLength(3);
    expect(screen.getByText("CELLULES · 3S")).toBeTruthy();
  });

  it("counts a four-cell pack as 4S", () => {
    renderDetail({ cellVoltages: MOCKUP_CELLS, cellCount: 4 });

    expect(screen.getByText(FAKE_CELL_COUNT)).toBeTruthy();
  });

  it.each(
    THEMES,
  )("states the spread in muted ink while nothing balances (%s)", (theme) => {
    renderDetail({ cellDelta: 0.023 }, theme);

    const delta = screen.getByTestId("cell-delta");

    expect(delta.textContent).toBe("Δ 23 mV");
    expect(paintOf("cell-delta").color).toBe(css(Colors[theme].textMuted));
  });

  it.each(
    THEMES,
  )("says the balancing is running, in success ink (%s)", (theme) => {
    renderDetail({ cellDelta: 0.023, balancing: true }, theme);

    const delta = screen.getByTestId("cell-delta");

    expect(delta.textContent).toBe("Δ 23 mV · équilibrage actif");
    expect(paintOf("cell-delta").color).toBe(css(Colors[theme].success));
  });

  it.each(THEMES)("reassures while no alarm is raised (%s)", (theme) => {
    renderDetail({}, theme);

    expect(paintOf("alarm-banner").backgroundColor).toBe(
      css(Colors[theme].successSurface),
    );
    expect(
      screen.getByText(
        "Aucune alarme. Tensions, températures et courants dans les seuils.",
      ),
    ).toBeTruthy();
  });

  it.each(THEMES)("names every raised alarm, in danger (%s)", (theme) => {
    renderDetail(
      { alarms: ["overvoltage", "overtemp"], hasAlarm: true },
      theme,
    );

    expect(paintOf("alarm-banner").backgroundColor).toBe(
      css(Colors[theme].dangerSurface),
    );
    expect(screen.getByText("Surtension · Température haute")).toBeTruthy();
  });
});

describe("the battery tab", () => {
  afterEach(() => {
    cleanup();
    resetNavigation();
  });

  it("renders what the BMS reports once the module is online", async () => {
    const harness = renderModuleScreen(<BatteryScreen />);
    await pairOnly(harness, ["battery"]);

    expect(await screen.findByText(FAKE_CELL_COUNT)).toBeTruthy();
    expect(screen.getByText(FAKE_WEAKEST_CELL)).toBeTruthy();
    expect(screen.getByTestId("battery-hero")).toBeTruthy();
  });

  it("opens the battery settings from its header", async () => {
    const harness = renderModuleScreen(<BatteryScreen />);
    await pairOnly(harness, ["battery"]);

    fireEvent.click(screen.getByText("settings"));

    expect(routerHistory).toContainEqual({
      method: "push",
      href: "/battery-settings",
    });
  });
});
