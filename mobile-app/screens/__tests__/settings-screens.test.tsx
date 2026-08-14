// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// createContainer reads this switch at import time, hence the dynamic imports below.
process.env.EXPO_PUBLIC_FAKE_BLE = "1";

const { pairOnly, renderModuleScreen } = await import("./moduleScreenHarness");
const { default: WaterSettingsScreen } = await import(
  "@/screens/water-settings-screen"
);
const { default: BatterySettingsScreen } = await import(
  "@/screens/battery-settings-screen"
);
const { ModuleRegistry } = await import("@/domain/modules/ModuleRegistry");
const { resetNavigation } = await import("@/__mocks__/expo-router");

describe("a settings screen whose module is offline", () => {
  afterEach(() => {
    cleanup();
    resetNavigation();
    vi.restoreAllMocks();
  });

  it("explains the water module is unreachable instead of showing an empty form", async () => {
    const harness = renderModuleScreen(<WaterSettingsScreen />);
    await pairOnly(harness, ["water"]);

    await act(async () => {
      harness.dropLink("fake-water");
    });

    expect(await screen.findByTestId("module-offline")).toBeTruthy();
    expect(screen.getByText("Water Module (fake)")).toBeTruthy();
  });

  it("reconnects the water module from its own screen", async () => {
    const reconnect = vi.spyOn(ModuleRegistry.prototype, "reconnect");
    const harness = renderModuleScreen(<WaterSettingsScreen />);
    await pairOnly(harness, ["water"]);
    await act(async () => {
      harness.dropLink("fake-water");
    });
    await screen.findByTestId("module-offline");

    await act(async () => {
      fireEvent.click(screen.getByTestId("reconnect"));
    });

    expect(reconnect).toHaveBeenCalledWith("water");
    await waitFor(() => {
      expect(screen.queryByTestId("module-offline")).toBeNull();
    });
  });

  it("explains the battery module is unreachable instead of showing an empty form", async () => {
    const harness = renderModuleScreen(<BatterySettingsScreen />);
    await pairOnly(harness, ["battery"]);

    await act(async () => {
      harness.dropLink("fake-battery");
    });

    expect(await screen.findByTestId("module-offline")).toBeTruthy();
    expect(screen.queryByText("Informations Batterie")).toBeNull();
  });

  it("tells an unpaired slot where to pair from", async () => {
    const harness = renderModuleScreen(<WaterSettingsScreen />);
    await pairOnly(harness, []);

    expect(await screen.findByTestId("module-unpaired")).toBeTruthy();
  });
});
