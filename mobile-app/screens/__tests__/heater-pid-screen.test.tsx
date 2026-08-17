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
import { afterEach, beforeEach, describe, expect, it } from "vitest";

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
const { ToastProvider } = await import("@/design-system");
const { resetNavigation, routerHistory } = await import(
  "@/__mocks__/expo-router"
);

/** The channel each zone speaks on, from HeaterSystem's own map. */
const ZONE_CHANNELS = ["0002", "0003", "0004", "0005"] as const;

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

function pidWritesOn(harness: ModulesHarness, zone: number): readonly string[] {
  return harness
    .firmwareCommands("heater", ZONE_CHANNELS[zone])
    .filter((command: string) => command.startsWith("CFG:"));
}

beforeEach(() => resetNavigation());
afterEach(() => cleanup());

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
    expect(screen.getByTestId("pid-3.kp-box")).toBeTruthy();
    expect(gainInput(3, "kp")).toHaveProperty("value", "150");
  });

  it("reports the refusing zone by name and still wrote the others", async () => {
    const harness = await renderPidForm();

    // The firmware stores gains ×100 and refuses beyond 10000 — 99.99 passes, the module's own bound does not.
    typeZone(2, ["99.99", "0.10", "0.50"]);
    typeZone(0, ["20.00", "0.10", "0.50"]);
    await save();

    await waitFor(() =>
      expect(pidWritesOn(harness, 0)).toContain("CFG:KP=2000;KI=10;KD=50"),
    );
    expect(pidWritesOn(harness, 2)).toContain("CFG:KP=9999;KI=10;KD=50");
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
