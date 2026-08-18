// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  screen,
  within,
} from "@testing-library/react";
import { useEffect } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// createContainer reads this switch at import time, hence the dynamic imports below.
process.env.EXPO_PUBLIC_FAKE_BLE = "1";

const { pairOnly, renderModuleScreen } = await import("./moduleScreenHarness");
const HomeScreen = (await import("@/screens/home-screen")).default;
const { useHeaterSystem } = await import("@/composition/ModuleSystemsProvider");
const { FakeBluetooth } = await import("@/infrastructure/fake/FakeBluetooth");
const { resetNavigation, routerHistory } = await import(
  "@/__mocks__/expo-router"
);

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
    fireEvent.click(screen.getByTestId("gauge-row-action"));
  });
}

type HeaterHandle = { stopAll: () => Promise<void> };

const heater: HeaterHandle = {
  stopAll: async () => {
    throw new Error("no heater module is online");
  },
};

/** The dashboard has no heater control, so a test reaches the zones through the system itself. */
function HeaterProbe() {
  const system = useHeaterSystem();

  useEffect(() => {
    if (system) heater.stopAll = system.stopAll;
  }, [system]);

  return null;
}

function dashboard() {
  return renderModuleScreen(
    <>
      <HeaterProbe />
      <HomeScreen />
    </>,
  );
}

function cardIds(): string[] {
  return screen
    .getAllByTestId(/^dashboard-card-/)
    .map((card) => card.getAttribute("data-testid") ?? "");
}

function tiles() {
  return screen.queryAllByTestId(/^environment-tile-/);
}

describe("the dashboard", () => {
  beforeEach(() => {
    heater.stopAll = async () => {
      throw new Error("no heater module is online");
    };
  });

  afterEach(() => {
    cleanup();
    resetNavigation();
    vi.restoreAllMocks();
  });

  // The ticket's own example: three modules, four cards, two of them the water module's.
  it("gives the water module both its cards while it is online", async () => {
    const harness = dashboard();
    await pairOnly(harness, ["battery", "water", "heater"]);

    await screen.findByTestId("dashboard-card-cleanWater");

    expect(cardIds()).toEqual([
      "dashboard-card-battery",
      "dashboard-card-cleanWater",
      "dashboard-card-greyWater",
      "dashboard-card-heater",
    ]);
  });

  it("folds an offline module into one card that offers to reconnect", async () => {
    const harness = dashboard();
    await pairOnly(harness, ["battery", "water", "heater"]);
    await screen.findByTestId("dashboard-card-cleanWater");

    await act(async () => {
      harness.dropLink("fake-water");
    });

    // The card keeps the place its module holds, between the battery and the heater.
    expect(cardIds()).toEqual([
      "dashboard-card-battery",
      "dashboard-card-water",
      "dashboard-card-heater",
    ]);
    const offline = within(screen.getByTestId("dashboard-card-water"));
    expect(offline.getByTestId("gauge-hatch")).toBeTruthy();
    expect(offline.getByText("Dernier contact à l'instant")).toBeTruthy();
    expect(offline.getByText("RECONNECTER")).toBeTruthy();
  });

  it("ignores a second reconnect while the first is still running", async () => {
    const harness = dashboard();
    await pairOnly(harness, ["water"]);
    await act(async () => {
      harness.dropLink("fake-water");
    });
    const radio = deferredConnect();

    await pressReconnect();

    expect(screen.getByText("RECONNEXION…")).toBeTruthy();

    await pressReconnect();
    await radio.fail();

    // The ignored press queued no attempt behind the first: the card offers the reconnection again.
    expect(radio.connect).toHaveBeenCalledTimes(1);
    expect(screen.getByText("RECONNECTER")).toBeTruthy();
  });

  // The ticket's last acceptance example: no module, no tile strip.
  it("offers three empty slots and hides the tiles while nothing is paired", async () => {
    const harness = dashboard();
    await pairOnly(harness, []);

    expect(cardIds()).toEqual([
      "dashboard-card-battery",
      "dashboard-card-water",
      "dashboard-card-heater",
    ]);
    expect(screen.getAllByTestId("gauge-hatch")).toHaveLength(3);
    expect(
      screen.getByText(
        "Aucun module n'est associé. Ajoute un module pour voir ses niveaux ici.",
      ),
    ).toBeTruthy();
    expect(tiles()).toHaveLength(0);
  });

  it("shows the tile strip as soon as one module is paired", async () => {
    const harness = dashboard();
    await pairOnly(harness, ["battery"]);

    await screen.findByTestId("dashboard-card-battery");

    expect(tiles()).toHaveLength(4);
    // The heater is unpaired, so the strip has measurements from nobody.
    expect(screen.getAllByText("-")).toHaveLength(4);
  });

  // A push, not a replace: acceptance example 4 needs the tab left underneath to come back to.
  it("pushes the application settings from its gear", async () => {
    const harness = dashboard();
    await pairOnly(harness, ["water"]);

    fireEvent.click(screen.getByTestId("page-settings"));

    expect(routerHistory).toEqual([{ method: "push", href: "/settings" }]);
  });

  it("marks no level on the heater card while every zone is off", async () => {
    const harness = dashboard();
    await pairOnly(harness, ["heater"]);
    await screen.findByTestId("dashboard-card-heater");

    await act(async () => {
      await heater.stopAll();
    });

    const card = within(screen.getByTestId("dashboard-card-heater"));
    expect(card.getByText("toutes zones à l'arrêt")).toBeTruthy();
    expect(card.queryByTestId("gauge-meniscus")).toBeNull();
  });
});
