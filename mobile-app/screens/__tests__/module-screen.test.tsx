// @vitest-environment jsdom
import { act, cleanup, fireEvent, screen } from "@testing-library/react";
import { Text } from "react-native";
import { afterEach, describe, expect, it, vi } from "vitest";

// createContainer reads this switch at import time, hence the dynamic imports below.
process.env.EXPO_PUBLIC_FAKE_BLE = "1";

const { pairOnly, renderModuleScreen } = await import("./moduleScreenHarness");
const { ModuleScreen } = await import("@/screens/module-screen");
const { FakeBluetooth } = await import("@/infrastructure/fake/FakeBluetooth");
const { resetNavigation } = await import("@/__mocks__/expo-router");

/** The fake tank the water scenario feeds, see infrastructure/fake/scenarios/waterScenario.ts. */
const CLEAN_TANK_PERCENTAGE = "72";

/** A connect the test settles itself: a hanging one cannot tell a guarded press from a queued one. */
function deferredConnect() {
  let refuse: (reason: Error) => void = () => {};
  const connect = vi
    .spyOn(FakeBluetooth.prototype, "connect")
    .mockImplementation(
      () =>
        new Promise<never>((_, reject) => {
          refuse = reject;
        }),
    );

  return {
    connect,
    fail: () =>
      act(async () => {
        refuse(new Error("out of range"));
      }),
  };
}

function pressReconnect() {
  return act(async () => {
    fireEvent.click(screen.getByTestId("offline-action"));
  });
}

function WaterTab() {
  return (
    <ModuleScreen
      moduleKey="water"
      titleKey="modules.water.tab"
      onSettingsPress={() => {}}
    >
      {(system) => (
        <Text testID="tank">
          {String(system.cleanTank.getValue().percentage)}
        </Text>
      )}
    </ModuleScreen>
  );
}

async function offlineWaterTab() {
  const harness = renderModuleScreen(<WaterTab />);
  await pairOnly(harness, ["water"]);

  await act(async () => {
    harness.dropLink("fake-water");
  });
  await screen.findByTestId("offline-card");

  return harness;
}

describe("the shell a module tab is built on", () => {
  afterEach(() => {
    cleanup();
    resetNavigation();
    vi.restoreAllMocks();
  });

  it("offers to pair instead of the screen when the slot is free", async () => {
    const harness = renderModuleScreen(<WaterTab />);
    await pairOnly(harness, []);

    expect(await screen.findByTestId("module-unpaired")).toBeTruthy();
    expect(screen.queryByTestId("tank")).toBeNull();
  });

  // The ticket's takeover example: the Eau tab, with its module offline.
  it("takes the whole tab over when the module goes offline", async () => {
    await offlineWaterTab();

    // The card wears the icon the catalogue names for the module.
    expect(screen.getByText("water-drop")).toBeTruthy();
    expect(screen.getByText("Dernier contact à l'instant")).toBeTruthy();
    expect(screen.getByText("RECONNECTER")).toBeTruthy();
    expect(screen.queryByTestId("tank")).toBeNull();
    // The header stays the module's own.
    expect(screen.getByText("Eau")).toBeTruthy();
  });

  it("renders the screen, and no notice, while the module is online", async () => {
    const harness = renderModuleScreen(<WaterTab />);
    await pairOnly(harness, ["water"]);

    const tank = await screen.findByTestId("tank");

    expect(tank.textContent).toBe(CLEAN_TANK_PERCENTAGE);
    expect(screen.queryByTestId("offline-card")).toBeNull();
    expect(screen.queryByTestId("module-unpaired")).toBeNull();
    // Planning decision 16: the link shows on the tab, so the header carries no bluetooth button.
    expect(screen.queryByText("bluetooth")).toBeNull();
  });

  it("ignores a second reconnect while the first is still running", async () => {
    await offlineWaterTab();
    const radio = deferredConnect();

    await pressReconnect();

    expect(screen.getByText("RECONNEXION…")).toBeTruthy();
    expect(screen.getByText("bluetooth-searching")).toBeTruthy();

    await pressReconnect();
    await radio.fail();

    // The ignored press queued no attempt behind the first: the tab offers the reconnection again.
    expect(radio.connect).toHaveBeenCalledTimes(1);
    expect(screen.getByText("RECONNECTER")).toBeTruthy();
  });
});
