// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

// The container is built when ContainerProvider is imported, so the switch has
// to be flipped before that import — hence the dynamic imports below.
process.env.EXPO_PUBLIC_FAKE_BLE = "1";

const { pairOnly, renderModuleScreen } = await import("./moduleScreenHarness");
const { default: AddModuleScreen } = await import(
  "@/screens/add-module-screen"
);
const { resetNavigation, routerHistory } = await import(
  "@/__mocks__/expo-router"
);

const WATER_DEVICE = "discovered-fake-water";

describe("the Ajouter screen", () => {
  afterEach(() => {
    cleanup();
    resetNavigation();
  });

  it("lists an advertising module with its name and MAC address", async () => {
    const harness = renderModuleScreen(<AddModuleScreen />);
    await pairOnly(harness, []);

    const row = within(await screen.findByTestId(WATER_DEVICE));

    expect(row.getByText("Water Module (fake)")).toBeTruthy();
    expect(row.getByText("fake-water")).toBeTruthy();
  });

  it("pairs a discovered module to its free slot", async () => {
    const harness = renderModuleScreen(<AddModuleScreen />);
    await pairOnly(harness, []);

    await act(async () => {
      fireEvent.click(await screen.findByTestId("pair-fake-water"));
    });

    await waitFor(() => {
      expect(pairedIds(harness)).toContain("fake-water");
    });
    expect(routerHistory).toContainEqual({ method: "back" });
  });

  it("offers no pairing action for a module type already paired", async () => {
    const harness = renderModuleScreen(<AddModuleScreen />);
    await pairOnly(harness, ["water"]);

    const row = within(await screen.findByTestId(WATER_DEVICE));

    expect(row.getByText("Emplacement occupé")).toBeTruthy();
    expect(screen.queryByTestId("pair-fake-water")).toBeNull();
  });

  it("keeps the other slots pairable while one type is taken", async () => {
    const harness = renderModuleScreen(<AddModuleScreen />);
    await pairOnly(harness, ["water"]);

    expect(screen.queryByTestId("pair-fake-water")).toBeNull();
    expect(await screen.findByTestId("pair-fake-heater")).toBeTruthy();
  });
});

function pairedIds(harness: {
  slots: () => readonly { pairing: { id: string } | null }[];
}): readonly string[] {
  return harness
    .slots()
    .flatMap((slot) => (slot.pairing ? [slot.pairing.id] : []));
}
