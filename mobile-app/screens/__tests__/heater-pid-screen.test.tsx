// @vitest-environment jsdom

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  act,
  cleanup,
  fireEvent,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// createContainer reads this switch at import time, hence the dynamic imports below.
process.env.EXPO_PUBLIC_FAKE_BLE = "1";

const { pairOnly, renderModuleScreen } = await import("./moduleScreenHarness");
type ModulesHarness = ReturnType<typeof renderModuleScreen>;
const { default: HeaterPidScreen } = await import(
  "@/screens/heater-pid-screen"
);
const { default: HeaterScreen } = await import("@/screens/heater-screen");
const { ZONE_NAME_KEYS } = await import("@/components/heater/zone-names");
const { createI18n } = await import("@/i18n/createI18n");
const { Colors, ToastProvider } = await import("@/design-system");
const { DEFAULT_WRITE_TIMEOUT_MS } = await import("@/domain/ConfirmedWrite");
const { resetNavigation, routerHistory } = await import(
  "@/__mocks__/expo-router"
);

/** The channel each zone speaks on, from HeaterSystem's own map. */
const ZONE_CHANNELS = ["0002", "0003", "0004", "0005"] as const;

let clockMs = 0;

/** ConfirmedWrite measures its deadline on sinceBoot, so the clock moves with the timers. */
function elapse(millis: number) {
  clockMs += millis;
  return act(async () => {
    vi.advanceTimersByTime(millis);
  });
}

async function renderPidForm() {
  const harness = renderModuleScreen(
    <ToastProvider>
      <HeaterPidScreen />
    </ToastProvider>,
  );
  await pairOnly(harness, ["heater"]);
  // The form only hydrates once every zone has answered CFG?.
  await waitFor(() =>
    expect(gainInput(0, "kp")).toHaveProperty("value", "10.00"),
  );
  return harness;
}

function gainInput(zone: number, gain: "kp" | "ki" | "kd") {
  return within(screen.getByTestId(`pid-${zone}.${gain}`)).getByRole("textbox");
}

function typeGain(zone: number, gain: "kp" | "ki" | "kd", value: string) {
  fireEvent.change(gainInput(zone, gain), { target: { value } });
}

function typeZone(zone: number, [kp, ki, kd]: readonly string[]) {
  typeGain(zone, "kp", kp);
  typeGain(zone, "ki", ki);
  typeGain(zone, "kd", kd);
}

async function save() {
  await act(async () => {
    fireEvent.click(screen.getByTestId("settings-form-save"));
  });
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

function borderOf(field: string): string {
  return window.getComputedStyle(screen.getByTestId(`pid-${field}-box`))
    .borderTopColor;
}

function toast(): string | null {
  return screen.queryByTestId("toast")?.textContent ?? null;
}

function pidWritesOn(harness: ModulesHarness, zone: number): readonly string[] {
  return harness
    .firmwareCommands("heater", ZONE_CHANNELS[zone])
    .filter((command: string) => command.startsWith("CFG:"));
}

beforeEach(() => {
  resetNavigation();
  clockMs = 0;
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.spyOn(performance, "now").mockImplementation(() => clockMs);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  cleanup();
});

describe("the PID form", () => {
  it("sends a zone's gains ×100, as the firmware carries them", async () => {
    const harness = await renderPidForm();

    typeZone(0, ["10.00", "0.10", "0.50"]);
    await save();

    await waitFor(() =>
      expect(pidWritesOn(harness, 0)).toContain("CFG:KP=1000;KI=10;KD=50"),
    );
  });

  it("writes a zone's gains to that zone's channel and to no other", async () => {
    const harness = await renderPidForm();

    typeZone(2, ["12.34", "0.56", "0.78"]);
    await save();

    const written = "CFG:KP=1234;KI=56;KD=78";
    await waitFor(() => expect(pidWritesOn(harness, 2)).toContain(written));
    for (const zone of [0, 1, 3]) {
      expect(pidWritesOn(harness, zone)).not.toContain(written);
    }
  });

  it("writes all four zones in one press, since the form saves as a whole", async () => {
    const harness = await renderPidForm();

    typeZone(1, ["11.00", "0.20", "0.60"]);
    await save();

    await waitFor(() =>
      expect(pidWritesOn(harness, 1)).toContain("CFG:KP=1100;KI=20;KD=60"),
    );
    for (const zone of [0, 2, 3]) {
      expect(pidWritesOn(harness, zone)).toContain("CFG:KP=1000;KI=10;KD=50");
    }
  });

  it("blocks a save on a gain the module would refuse, with nothing sent", async () => {
    const harness = await renderPidForm();

    typeGain(3, "kp", "150");
    await save();

    expect(pidWritesOn(harness, 3)).toEqual([]);
    expect(DANGER).toContain(borderOf("3.kp"));
    expect(DANGER).not.toContain(borderOf("3.ki"));
    expect(gainInput(3, "kp")).toHaveProperty("value", "150");
  });

  it("says why a blocked press reached no module, rather than doing nothing", async () => {
    const blocked = createI18n("fr").t("settings.save.blocked");
    await renderPidForm();

    typeGain(1, "kd", "0");
    await save();

    expect(toast()).toBe(blocked);
  });

  it("writes what it displays: a third decimal cannot survive one press and change on the next", async () => {
    const harness = await renderPidForm();

    typeGain(0, "ki", "0.015");
    await save();

    await waitFor(() =>
      expect(pidWritesOn(harness, 0)).toContain("CFG:KP=1000;KI=2;KD=50"),
    );
    expect(gainInput(0, "ki")).toHaveProperty("value", "0.02");

    await save();

    expect(pidWritesOn(harness, 0).at(-1)).toBe("CFG:KP=1000;KI=2;KD=50");
  });

  it("names the zone that did not confirm, and still wrote the others", async () => {
    const t = createI18n("fr").t;
    const harness = await renderPidForm();
    // No form-valid gain is refusable: 0.01–100 is exactly the firmware's own bound,
    // so a partial failure is only reachable through a zone that stops answering.
    harness.silenceChannel("heater", ZONE_CHANNELS[2]);

    typeZone(0, ["20.00", "0.10", "0.50"]);
    await save();
    // The write deadline, then the readback window the silent zone also lets expire.
    await elapse(DEFAULT_WRITE_TIMEOUT_MS);
    await elapse(DEFAULT_WRITE_TIMEOUT_MS);

    expect(pidWritesOn(harness, 0)).toContain("CFG:KP=2000;KI=10;KD=50");
    expect(toast()).toBe(
      t("settings.save.notConfirmed", { field: t("heater.zones.zone3") }),
    );
  });
});

describe("the zone vocabulary", () => {
  it("names the zones on the form exactly as the piloting screen does", async () => {
    const t = createI18n("fr").t;
    const expected = ZONE_NAME_KEYS.map((key) => t(key).toUpperCase());

    await renderPidForm();
    for (const name of expected) {
      expect(screen.getByText(`PID · ${name}`)).toBeTruthy();
    }
    cleanup();

    const piloting = renderModuleScreen(
      <ToastProvider>
        <HeaterScreen />
      </ToastProvider>,
    );
    await pairOnly(piloting, ["heater"]);
    for (const name of expected) {
      expect(screen.getByText(name)).toBeTruthy();
    }
  });

  it("leaves no second zone dictionary for the two screens to disagree over", () => {
    const retired = ["heater", "settings", "zone"].join(".");
    const offenders = sourceFiles(APP_ROOT)
      .filter((file) => file !== import.meta.filename)
      .filter((file) => readFileSync(file, "utf8").includes(retired));

    expect(offenders).toEqual([]);
  });
});

const APP_ROOT = join(import.meta.dirname, "..", "..");
const SKIPPED = new Set(["node_modules", ".expo", "coverage", "assets"]);

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      return SKIPPED.has(entry.name) ? [] : sourceFiles(path);
    }
    return /\.tsx?$/.test(entry.name) ? [path] : [];
  });
}

describe("the Chauffage tab's settings chip", () => {
  it("pushes the PID form, so back returns to the tab", async () => {
    const harness = renderModuleScreen(
      <ToastProvider>
        <HeaterScreen />
      </ToastProvider>,
    );
    await pairOnly(harness, ["heater"]);

    fireEvent.click(screen.getByTestId("page-settings"));

    expect(routerHistory).toContainEqual({
      method: "push",
      href: "/settings/heater-pid",
    });
  });
});
