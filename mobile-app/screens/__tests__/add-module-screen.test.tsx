// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { DiscoveredBluetoothDevice } from "@/domain/ports/BluetoothScanner";

// createContainer reads this switch at import time, hence the dynamic imports below.
process.env.EXPO_PUBLIC_FAKE_BLE = "1";

const { pairOnly, renderModuleScreen, switchableLanguage } = await import(
  "./moduleScreenHarness"
);
const { default: AddModuleScreen } = await import(
  "@/screens/add-module-screen"
);
const { ModuleRegistry } = await import("@/domain/modules/ModuleRegistry");
const { FakeBluetooth } = await import("@/infrastructure/fake/FakeBluetooth");
const { resetNavigation, routerHistory } = await import(
  "@/__mocks__/expo-router"
);
const { WATER_MODULE } = await import("@/domain/modules/ModuleDescriptor");
const { NotConnectedError } = await import(
  "@/infrastructure/session/NotConnectedError"
);

const WATER_DEVICE = "discovered-fake-water";
const SCAN_TIMEOUT_MS = 30_000;

const LATE_DEVICE: DiscoveredBluetoothDevice = {
  id: "late-water",
  name: "Water Module (late)",
  serviceUuids: [WATER_MODULE.scanServiceUuid],
};

/** Lets every pending promise settle, timers included, before the assertion reads the radio. */
function flush(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe("the Ajouter screen", () => {
  afterEach(() => {
    cleanup();
    resetNavigation();
    vi.restoreAllMocks();
    vi.useRealTimers();
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

    expect(row.getByText("Déjà appairé")).toBeTruthy();
    expect(screen.queryByTestId("pair-fake-water")).toBeNull();
  });

  it("keeps the other slots pairable while one type is taken", async () => {
    const harness = renderModuleScreen(<AddModuleScreen />);
    await pairOnly(harness, ["water"]);

    expect(screen.queryByTestId("pair-fake-water")).toBeNull();
    expect(await screen.findByTestId("pair-fake-heater")).toBeTruthy();
  });

  it("stops the scan when the 30 s window closes", async () => {
    vi.useFakeTimers();
    const stopScan = vi.spyOn(FakeBluetooth.prototype, "stopScan");
    renderModuleScreen(<AddModuleScreen />);

    await act(async () => {
      vi.advanceTimersByTime(SCAN_TIMEOUT_MS);
    });

    expect(stopScan).toHaveBeenCalled();
    expect(screen.getByText("Recherche terminée")).toBeTruthy();
  });

  it("stops the scan when the screen goes away", async () => {
    const stopScan = vi.spyOn(FakeBluetooth.prototype, "stopScan");
    renderModuleScreen(<AddModuleScreen />);
    await screen.findByTestId(WATER_DEVICE);
    stopScan.mockClear();

    await act(async () => {
      cleanup();
    });

    expect(stopScan).toHaveBeenCalledTimes(1);
  });

  it("leaves no radio scanning when the screen goes away before the scan starts", async () => {
    const radio = { isScanning: false };
    let grantPermission = () => {};
    vi.spyOn(FakeBluetooth.prototype, "startScan").mockImplementation(
      async () => {
        await new Promise<void>((resolve) => {
          grantPermission = resolve;
        });
        radio.isScanning = true;
      },
    );
    vi.spyOn(FakeBluetooth.prototype, "stopScan").mockImplementation(
      async () => {
        radio.isScanning = false;
      },
    );
    renderModuleScreen(<AddModuleScreen />);

    await act(async () => {
      cleanup();
    });
    await act(async () => {
      grantPermission();
      await flush();
    });

    expect(radio.isScanning).toBe(false);
  });

  it("leaves no radio scanning when the 30 s window closes before the scan starts", async () => {
    vi.useFakeTimers();
    const radio: {
      isScanning: boolean;
      report: ((device: DiscoveredBluetoothDevice) => void) | null;
    } = { isScanning: false, report: null };
    let grantPermission = () => {};
    vi.spyOn(FakeBluetooth.prototype, "startScan").mockImplementation(
      async (_serviceUuids, onDeviceFound) => {
        await new Promise<void>((resolve) => {
          grantPermission = resolve;
        });
        radio.isScanning = true;
        radio.report = onDeviceFound;
      },
    );
    vi.spyOn(FakeBluetooth.prototype, "stopScan").mockImplementation(
      async () => {
        radio.isScanning = false;
        radio.report = null;
      },
    );
    renderModuleScreen(<AddModuleScreen />);

    await act(async () => {
      vi.advanceTimersByTime(SCAN_TIMEOUT_MS);
    });
    // the timeout has fired; flush needs a macrotask fake timers would never reach
    vi.useRealTimers();
    await act(async () => {
      grantPermission();
      await flush();
    });
    await act(async () => {
      radio.report?.(LATE_DEVICE);
    });

    expect(radio.isScanning).toBe(false);
    expect(screen.queryByTestId(`discovered-${LATE_DEVICE.id}`)).toBeNull();
  });

  it("does not navigate when a slow pairing lands after the screen is gone", async () => {
    let completePairing = () => {};
    vi.spyOn(ModuleRegistry.prototype, "pair").mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          completePairing = resolve;
        }),
    );
    const harness = renderModuleScreen(<AddModuleScreen />);
    await pairOnly(harness, []);

    await act(async () => {
      fireEvent.click(await screen.findByTestId("pair-fake-water"));
    });
    await act(async () => {
      cleanup();
    });
    await act(async () => {
      completePairing();
      await flush();
    });

    expect(routerHistory).not.toContainEqual({ method: "back" });
  });

  // Acceptance example 7 says every screen, so a failure already on screen switches too.
  it("re-reads a displayed pairing failure in the language chosen after it", async () => {
    const { tree, switchTo } = switchableLanguage(<AddModuleScreen />);
    const harness = renderModuleScreen(tree);
    await pairOnly(harness, []);
    vi.spyOn(ModuleRegistry.prototype, "pair").mockRejectedValue(
      new NotConnectedError(),
    );

    await act(async () => {
      fireEvent.click(await screen.findByTestId("pair-fake-water"));
    });
    expect(screen.getByText("Module non connecté.")).toBeTruthy();

    await act(async () => {
      switchTo("en");
    });

    expect(screen.getByText("Module not connected.")).toBeTruthy();
  });

  it("says nothing was found once a fruitless scan ends", async () => {
    vi.useFakeTimers();
    vi.spyOn(FakeBluetooth.prototype, "startScan").mockResolvedValue(undefined);
    renderModuleScreen(<AddModuleScreen />);

    await act(async () => {
      vi.advanceTimersByTime(SCAN_TIMEOUT_MS);
    });

    expect(screen.getByText("Aucun module trouvé.")).toBeTruthy();
  });

  it("runs a new scan when the user asks for one", async () => {
    vi.useFakeTimers();
    const startScan = vi.spyOn(FakeBluetooth.prototype, "startScan");
    renderModuleScreen(<AddModuleScreen />);
    await act(async () => {
      vi.advanceTimersByTime(SCAN_TIMEOUT_MS);
    });
    startScan.mockClear();

    await act(async () => {
      fireEvent.click(screen.getByTestId("rescan"));
    });

    expect(startScan).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Recherche en cours…")).toBeTruthy();
  });
});

function pairedIds(harness: {
  slots: () => readonly { pairing: { id: string } | null }[];
}): readonly string[] {
  return harness
    .slots()
    .flatMap((slot) => (slot.pairing ? [slot.pairing.id] : []));
}
