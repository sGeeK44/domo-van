// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// The container is built when ContainerProvider is imported, so the switch has
// to be flipped before that import — hence the dynamic imports below.
process.env.EXPO_PUBLIC_FAKE_BLE = "1";

const { pairOnly, renderModuleScreen } = await import("./moduleScreenHarness");
const { default: ModulesScreen } = await import("@/screens/modules-screen");
const { ModuleRegistry } = await import("@/domain/modules/ModuleRegistry");
const { resetNavigation, routerHistory, setOpenTab } = await import(
  "@/__mocks__/expo-router"
);

async function openUnpairSheet(key: string): Promise<void> {
  fireEvent.click(screen.getByTestId(`unpair-${key}`));
  await screen.findByTestId("unpair-confirm");
}

async function confirmUnpair(): Promise<void> {
  await act(async () => {
    fireEvent.click(screen.getByTestId("unpair-confirm"));
  });
}

describe("the Modules screen", () => {
  afterEach(() => {
    cleanup();
    resetNavigation();
    vi.restoreAllMocks();
  });

  it("shows one row per paired module and a dashed placeholder per free slot", async () => {
    const harness = renderModuleScreen(<ModulesScreen />);

    await pairOnly(harness, ["water"]);

    expect(screen.getByTestId("module-slot-water")).toBeTruthy();
    expect(screen.getByTestId("free-slot-heater")).toBeTruthy();
    expect(screen.getByTestId("free-slot-battery")).toBeTruthy();
    expect(screen.queryByTestId("module-slot-heater")).toBeNull();
  });

  it("frees the slot once, when the sheet is confirmed", async () => {
    const unpair = vi.spyOn(ModuleRegistry.prototype, "unpair");
    const harness = renderModuleScreen(<ModulesScreen />);
    await pairOnly(harness, ["water"]);
    unpair.mockClear();

    await openUnpairSheet("water");
    await confirmUnpair();

    await waitFor(() => {
      expect(screen.getByTestId("free-slot-water")).toBeTruthy();
    });
    expect(screen.queryByTestId("module-slot-water")).toBeNull();
    expect(unpair).toHaveBeenCalledTimes(1);
    expect(unpair).toHaveBeenCalledWith("water");
  });

  it("keeps the paired module when the sheet is cancelled", async () => {
    const harness = renderModuleScreen(<ModulesScreen />);
    await pairOnly(harness, ["heater"]);

    await openUnpairSheet("heater");
    fireEvent.click(screen.getByTestId("unpair-cancel"));

    expect(screen.getByTestId("module-slot-heater")).toBeTruthy();
    expect(screen.queryByTestId("free-slot-heater")).toBeNull();
  });

  it("returns to the dashboard when the unpaired module owns the open tab", async () => {
    setOpenTab("heater");
    const harness = renderModuleScreen(<ModulesScreen />);
    await pairOnly(harness, ["heater"]);

    await openUnpairSheet("heater");
    await confirmUnpair();

    await waitFor(() => {
      expect(routerHistory).toContainEqual({
        method: "replace",
        href: "/(tabs)",
      });
    });
  });

  it("stays on the screen when another module owns the open tab", async () => {
    setOpenTab("water");
    const harness = renderModuleScreen(<ModulesScreen />);
    await pairOnly(harness, ["water", "heater"]);

    await openUnpairSheet("heater");
    await confirmUnpair();

    await waitFor(() => {
      expect(screen.getByTestId("free-slot-heater")).toBeTruthy();
    });
    expect(routerHistory).not.toContainEqual({
      method: "replace",
      href: "/(tabs)",
    });
  });

  it("opens the module's own settings from its row", async () => {
    const harness = renderModuleScreen(<ModulesScreen />);
    await pairOnly(harness, ["water"]);

    fireEvent.click(screen.getByTestId("module-settings-water"));

    expect(routerHistory).toContainEqual({
      method: "push",
      href: "/water-settings",
    });
  });

  it("sends a free slot to the Ajouter screen", async () => {
    const harness = renderModuleScreen(<ModulesScreen />);
    await pairOnly(harness, []);

    fireEvent.click(screen.getByTestId("free-slot-water"));

    expect(routerHistory).toContainEqual({
      method: "push",
      href: "/add-module",
    });
  });
});
